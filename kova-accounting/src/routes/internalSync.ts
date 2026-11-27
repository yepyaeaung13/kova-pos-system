import type { FastifyPluginAsync } from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { db } from '../db.js';
import { postJournal } from '../journal.js';

const ApplyJournalMutationSchema = Type.Object({
  tenantId: Type.String(),
  branchId: Type.String(),
  idempotencyKey: Type.String(),
  entityId: Type.String(),
  operation: Type.Optional(Type.Union([Type.Literal('UPSERT'), Type.Literal('DELETE')])),
  payload: Type.Object({
    entryNo: Type.Optional(Type.String()),
    memo: Type.Optional(Type.String()),
    lines: Type.Optional(
      Type.Array(
        Type.Object({
          accountCode: Type.String(),
          debitCents: Type.Integer({ minimum: 0 }),
          creditCents: Type.Integer({ minimum: 0 }),
        }),
        { minItems: 2 }
      )
    ),
  }),
});

interface JournalBody {
  tenantId: string;
  branchId: string;
  idempotencyKey: string;
  entityId: string;
  operation?: 'UPSERT' | 'DELETE';
  payload: {
    entryNo?: string;
    memo?: string;
    lines?: Array<{ accountCode: string; debitCents: number; creditCents: number }>;
  };
}

export const internalSyncRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<TypeBoxTypeProvider>();

  app.post(
    '/internal/sync/apply',
    { schema: { body: ApplyJournalMutationSchema } },
    async (req, reply) => {
      const {
        tenantId,
        branchId,
        idempotencyKey,
        entityId,
        operation = 'UPSERT',
        payload,
      } = req.body as JournalBody;
      const headerTenantId = String(req.headers['x-tenant-id'] ?? '');
      const headerBranchId = String(req.headers['x-branch-id'] ?? '');
      if (!headerTenantId || !headerBranchId || headerTenantId !== tenantId || headerBranchId !== branchId) {
        return reply.code(403).send({ status: 'rejected', reason: 'Tenant/branch header mismatch' } as never);
      }

      if (operation === 'DELETE') {
        await db.transaction().execute(async (trx) => {
          const existing = await trx
            .selectFrom('processed_mutations')
            .select('idempotency_key')
            .where('idempotency_key', '=', idempotencyKey)
            .executeTakeFirst();
          if (existing) return;

          await trx
            .deleteFrom('acc_journal_entries')
            .where('id', '=', entityId)
            .where('branch_id', '=', branchId)
            .execute();

          await trx
            .insertInto('processed_mutations')
            .values({
              idempotency_key: idempotencyKey,
              entity_type: 'JournalEntry',
              entity_id: entityId,
              result_status: 'acked',
            })
            .onConflict((oc) => oc.column('idempotency_key').doNothing())
            .execute();
        });
        return { status: 'acked' as const };
      }

      const { memo, lines } = payload;
      if (!memo || !lines || lines.length < 2) {
        return reply.code(400).send({ status: 'rejected', reason: 'Journal needs a memo and balanced lines' } as never);
      }

      const debitSum = lines.reduce((sum, line) => sum + line.debitCents, 0);
      const creditSum = lines.reduce((sum, line) => sum + line.creditCents, 0);
      if (debitSum !== creditSum) {
        return reply.code(400).send({ status: 'rejected', reason: 'Unbalanced journal' } as never);
      }

      await db.transaction().execute(async (trx) => {
        const existing = await trx
          .selectFrom('processed_mutations')
          .select('idempotency_key')
          .where('idempotency_key', '=', idempotencyKey)
          .executeTakeFirst();

        if (existing) {
          return;
        }

        await postJournal(
          trx,
          branchId,
          'JournalEntry',
          entityId,
          payload.entryNo ? `${memo} (${payload.entryNo})` : memo,
          lines
        );

        await trx
          .insertInto('processed_mutations')
          .values({
            idempotency_key: idempotencyKey,
            entity_type: 'JournalEntry',
            entity_id: entityId,
            result_status: 'acked',
          })
          .onConflict((oc) => oc.column('idempotency_key').doNothing())
          .execute();
      });

      return { status: 'acked' as const };
    }
  );
};
