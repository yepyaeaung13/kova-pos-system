import type { FastifyPluginAsync } from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { db } from '../db.js';
import { signAccessJwt } from '../jwt.js';
import { hashPassword, verifyPassword, hashPin, verifyPin } from '../crypto.js';
import { randomUUID } from 'crypto';

const LoginRequestSchema = Type.Object({
  email: Type.String({ format: 'email' }),
  password: Type.String({ minLength: 8 }),
  deviceId: Type.String({ minLength: 1 }),
});

const LoginResponseSchema = Type.Object({
  accessToken: Type.String(),
  refreshToken: Type.String(),
  tenantId: Type.String(),
  branchId: Type.String(),
  terminalId: Type.String(),
  docPrefix: Type.String(),
  offlineStaffRoster: Type.Array(
    Type.Object({
      userId: Type.String(),
      fullName: Type.String(),
      role: Type.String(),
      pinHash: Type.String(),
    })
  ),
});

const PinUnlockRequestSchema = Type.Object({
  terminalId: Type.String(),
  pin: Type.String({ minLength: 4, maxLength: 6 }),
});

const PinUnlockResponseSchema = Type.Object({
  accessToken: Type.String(),
  staff: Type.Object({
    id: Type.String(),
    fullName: Type.String(),
    role: Type.String(),
    apps: Type.Array(Type.String()),
  }),
  terminal: Type.Object({
    id: Type.String(),
    branchId: Type.String(),
    docPrefix: Type.String(),
  }),
});

interface LoginBody {
  email: string;
  password: string;
  deviceId: string;
}

interface PinUnlockBody {
  terminalId: string;
  pin: string;
}

export const loginRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<TypeBoxTypeProvider>();

  app.post(
    '/api/v1/auth/login',
    {
      schema: {
        body: LoginRequestSchema,
        response: { 200: LoginResponseSchema },
      },
    },
    async (req, reply) => {
      const { email, password, deviceId } = req.body as LoginBody;

      const user = await db
        .selectFrom('users')
        .select(['id', 'tenant_id', 'branch_id', 'role', 'password_hash'])
        .where('email', '=', email)
        .where('active', '=', true)
        .executeTakeFirst();

      if (!user || !(await verifyPassword(password, user.password_hash))) {
        return reply.code(401).send({ message: 'Invalid credentials' } as never);
      }

      const terminal = await db
        .selectFrom('terminals')
        .select(['id', 'doc_prefix'])
        .where('device_id', '=', deviceId)
        .where('tenant_id', '=', user.tenant_id)
        .executeTakeFirst();

      if (!terminal) {
        return reply.code(403).send({ message: 'Terminal not registered' } as never);
      }

      const accessToken = await signAccessJwt({
        sub: user.id,
        tenantId: user.tenant_id,
        branchId: user.branch_id,
        terminalId: terminal.id,
        role: user.role,
      });

      const tokenData = randomUUID() + '.' + randomUUID();
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(tokenData));
      const tokenHash = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      await db
        .insertInto('refresh_tokens')
        .values({
          id: randomUUID(),
          family_id: randomUUID(),
          user_id: user.id,
          terminal_id: terminal.id,
          token_hash: tokenHash,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        })
        .execute();

      const roster = await db
        .selectFrom('users')
        .select(['id', 'full_name', 'role', 'pin_hash'])
        .where('tenant_id', '=', user.tenant_id)
        .where('branch_id', '=', user.branch_id)
        .where('active', '=', true)
        .execute();

      return {
        accessToken,
        refreshToken: tokenData,
        tenantId: user.tenant_id,
        branchId: user.branch_id,
        terminalId: terminal.id,
        docPrefix: terminal.doc_prefix,
        offlineStaffRoster: roster.map((r) => ({
          userId: r.id,
          fullName: r.full_name,
          role: r.role,
          pinHash: r.pin_hash,
        })),
      };
    }
  );

  app.post(
    '/api/v1/auth/pin-unlock',
    {
      schema: {
        body: PinUnlockRequestSchema,
        response: { 200: PinUnlockResponseSchema },
      },
    },
    async (req, reply) => {
      const { terminalId, pin } = req.body as PinUnlockBody;

      const terminal = await db
        .selectFrom('terminals')
        .select(['id', 'branch_id', 'doc_prefix'])
        .where('id', '=', terminalId)
        .executeTakeFirst();

      if (!terminal) {
        return reply.code(404).send({ error: 'Unknown terminal' } as never);
      }

      const matched = await db
        .selectFrom('users')
        .select(['id', 'full_name', 'role', 'pin_hash', 'tenant_id', 'branch_id'])
        .where('branch_id', '=', terminal.branch_id)
        .where('active', '=', true)
        .execute()
        .then((rows) => rows.find((s) => verifyPin(pin, s.pin_hash)));

      if (!matched) {
        return reply.code(401).send({ error: 'Invalid PIN' } as never);
      }

      const ROLE_APPS: Record<string, string[]> = {
        Cashier: ['sale'],
        Storekeeper: ['inventory'],
        Accountant: ['accounting'],
        Owner: ['sale', 'inventory', 'accounting'],
      };
      const apps = ROLE_APPS[matched.role] ?? ['sale'];

      const accessToken = await signAccessJwt({
        sub: matched.id,
        tenantId: matched.tenant_id,
        branchId: terminal.branch_id,
        terminalId: terminal.id,
        role: matched.role,
        apps,
      });

      return {
        accessToken,
        staff: {
          id: matched.id,
          fullName: matched.full_name,
          role: matched.role,
          apps,
        },
        terminal: {
          id: terminal.id,
          branchId: terminal.branch_id,
          docPrefix: terminal.doc_prefix,
        },
      };
    }
  );

  app.post(
    '/api/v1/auth/refresh',
    {
      schema: {
        body: Type.Object({ refreshToken: Type.String() }),
        response: { 200: Type.Object({ accessToken: Type.String() }) },
      },
    },
    async (req, reply) => {
      const { refreshToken } = req.body as { refreshToken: string };

      const rt = await db
        .selectFrom('refresh_tokens')
        .select(['id', 'user_id', 'terminal_id', 'revoked_at', 'expires_at'])
        .where('token_hash', '=', refreshToken)
        .executeTakeFirst();

      if (!rt || rt.revoked_at || new Date(rt.expires_at) < new Date()) {
        return reply.code(401).send({ message: 'Invalid or expired refresh token' } as never);
      }

      const user = await db
        .selectFrom('users')
        .select(['id', 'tenant_id', 'branch_id', 'role'])
        .where('id', '=', rt.user_id)
        .executeTakeFirst();

      if (!user) {
        return reply.code(401).send({ message: 'User not found' } as never);
      }

      const accessToken = await signAccessJwt({
        sub: user.id,
        tenantId: user.tenant_id,
        branchId: user.branch_id,
        terminalId: rt.terminal_id,
        role: user.role,
      });

      return { accessToken };
    }
  );
};
