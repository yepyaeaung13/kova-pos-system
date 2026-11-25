import type { FastifyPluginAsync } from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import {
  SyncPushRequestSchema,
  SyncPushResponseSchema,
  type SyncPushResponse,
  type SyncPushRequest,
} from '@kova/contracts';
import { db } from '../db.js';
import { dispatchToDomainService } from '../dispatcher.js';

interface PushBody {
  mutations: SyncPushRequest['mutations'];
}

export const pushRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<TypeBoxTypeProvider>();

  app.post(
    '/api/v1/sync/push',
    {
      schema: {
        body: SyncPushRequestSchema,
        response: { 200: SyncPushResponseSchema },
      },
    },
    async (req) => {
      const tenantId = String(req.headers['x-tenant-id'] ?? '');
      const branchId = String(req.headers['x-branch-id'] ?? '');
      const { mutations } = req.body as PushBody;
      const results: SyncPushResponse['results'] = [];

      for (const m of mutations) {
        // 1. Idempotency replay check
        const existing = await db
          .selectFrom('processed_mutations')
          .select(['result_status', 'server_seq'])
          .where('idempotency_key', '=', m.idempotencyKey)
          .executeTakeFirst();

        if (existing) {
          results.push({
            outboxId: m.outboxId,
            status: existing.result_status as 'acked' | 'conflict' | 'rejected',
            serverSeq: existing.server_seq ? Number(existing.server_seq) : undefined,
          });
          continue;
        }

        // 2. Dispatch to owning domain service
        const dispatchOutcome = await dispatchToDomainService(tenantId, branchId, m);

        let serverSeq: number | undefined;
        if (dispatchOutcome.status === 'acked') {
          const seqRes = await db
            .insertInto('branch_changelog')
            .values({
              tenant_id: tenantId,
              branch_id: branchId,
              service_name: dispatchOutcome.serviceName,
              entity_type: m.entityType,
              entity_id: m.entityId,
              operation: m.operation,
              data: m.payload,
            })
            .returning('seq')
            .executeTakeFirst();
          serverSeq = seqRes ? Number(seqRes.seq) : undefined;
        }

        // 3. Record idempotency outcome
        await db
          .insertInto('processed_mutations')
          .values({
            idempotency_key: m.idempotencyKey,
            tenant_id: tenantId,
            branch_id: branchId,
            entity_type: m.entityType,
            entity_id: m.entityId,
            result_status: dispatchOutcome.status,
            server_seq: serverSeq ?? null,
          })
          .execute();

        results.push({
          outboxId: m.outboxId,
          status: dispatchOutcome.status,
          serverSeq,
          serverSnapshot: dispatchOutcome.serverSnapshot,
          reason: dispatchOutcome.reason,
        });
      }

      return { results };
    }
  );
};
