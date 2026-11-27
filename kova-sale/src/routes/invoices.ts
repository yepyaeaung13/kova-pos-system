import type { FastifyPluginAsync } from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { sql } from 'kysely';
import { db } from '../db.js';

export const invoicesRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<TypeBoxTypeProvider>();

  app.get(
    '/api/v1/sale/invoices',
    {
      schema: {
        response: { 200: Type.Array(Type.Object({ id: Type.String(), docNo: Type.String(), grandTotalCents: Type.Integer() })) },
      },
    },
    async (req, reply) => {
      const tenantId = String(req.headers['x-tenant-id'] ?? '');
      const branchId = String(req.headers['x-branch-id'] ?? '');
      if (!tenantId || !branchId) {
        return reply.code(400).send({ message: 'Missing x-tenant-id or x-branch-id header' } as never);
      }

      const rows = await db
        .selectFrom('sale_invoices')
        .select(['id', 'doc_no', 'grand_total_cents'])
        .where('tenant_id', '=', tenantId)
        .where('branch_id', '=', branchId)
        .orderBy('created_at', 'desc')
        .limit(100)
        .execute();

      return rows.map((r) => ({ id: r.id, docNo: r.doc_no, grandTotalCents: r.grand_total_cents }));
    }
  );

  app.get(
    '/api/v1/sale/z-report',
    {
      schema: {
        response: { 200: Type.Object({ totalCents: Type.Integer(), count: Type.Integer() }) },
      },
    },
    async (req, reply) => {
      const tenantId = String(req.headers['x-tenant-id'] ?? '');
      const branchId = String(req.headers['x-branch-id'] ?? '');
      if (!tenantId || !branchId) {
        return reply.code(400).send({ message: 'Missing x-tenant-id or x-branch-id header' } as never);
      }

      const result = await db
        .selectFrom('sale_invoices')
        .select([
          sql<number>`coalesce(sum("grand_total_cents"), 0)`.as('total'),
          sql<number>`count(*)`.as('count'),
        ])
        .where('tenant_id', '=', tenantId)
        .where('branch_id', '=', branchId)
        .where('payment_status', '=', 'Paid')
        .executeTakeFirst();

      return {
        totalCents: Number(result?.total ?? 0),
        count: Number(result?.count ?? 0),
      };
    }
  );
};
