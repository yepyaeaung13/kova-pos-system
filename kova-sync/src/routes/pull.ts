import type { FastifyPluginAsync } from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import {
  SyncPullQuerySchema,
  SyncPullResponseSchema,
  type SyncPullQuery,
} from '@kova/contracts';
import { db } from '../db.js';

interface PullQuery {
  cursor: number;
  limit: number;
}

export const pullRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<TypeBoxTypeProvider>();

  app.get(
    '/api/v1/sync/pull',
    {
      schema: {
        querystring: SyncPullQuerySchema,
        response: { 200: SyncPullResponseSchema },
      },
    },
    async (req, reply) => {
      const tenantId = String(req.headers['x-tenant-id'] ?? '');
      const branchId = String(req.headers['x-branch-id'] ?? '');
      if (!tenantId || !branchId) {
        return reply.code(400).send({ message: 'Missing x-tenant-id or x-branch-id header' } as never);
      }

      const { cursor, limit } = req.query as PullQuery;

      const rows = await db
        .selectFrom('branch_changelog')
        .select([
          'seq',
          'service_name',
          'entity_type',
          'entity_id',
          'operation',
          'data',
          'created_at',
        ])
        .where('tenant_id', '=', tenantId)
        .where('branch_id', '=', branchId)
        .where('seq', '>', cursor)
        .orderBy('seq', 'asc')
        .limit(limit + 1)
        .execute();

      const hasMore = rows.length > limit;
      const slice = hasMore ? rows.slice(0, limit) : rows;
      const nextCursor = slice.length > 0 ? Number(slice[slice.length - 1].seq) : cursor;

      return {
        deltas: slice.map((r) => ({
          seq: Number(r.seq),
          serviceName: r.service_name,
          entityType: r.entity_type,
          entityId: r.entity_id,
          operation: r.operation,
          data: r.data,
          createdAt: r.created_at?.toISOString() ?? new Date().toISOString(),
        })),
        nextCursor,
        hasMore,
      };
    }
  );
};
