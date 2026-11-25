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
    async () => {
      const rows = await db
        .selectFrom('sale_invoices')
        .select(['id', 'doc_no', 'grand_total_cents'])
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
    async () => {
      const result = await db
        .selectFrom('sale_invoices')
        .select([
          sql<number>`coalesce(sum("grand_total_cents"), 0)`.as('total'),
          sql<number>`count(*)`.as('count'),
        ])
        .where('payment_status', '=', 'Paid')
        .executeTakeFirst();

      return {
        totalCents: Number(result?.total ?? 0),
        count: Number(result?.count ?? 0),
      };
    }
  );
};
