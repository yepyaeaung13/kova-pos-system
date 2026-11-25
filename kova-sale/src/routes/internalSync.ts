import type { FastifyPluginAsync } from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import {
  SUBJECTS,
  calcLineTotalCents,
  calcGstExclusiveCents,
  calcGrandTotalCents,
  type SaleCompletedEvent,
} from '@kova/contracts';
import { db } from '../db.js';

const ApplySaleMutationSchema = Type.Object({
  tenantId: Type.String(),
  branchId: Type.String(),
  idempotencyKey: Type.String(),
  entityId: Type.String(),
  payload: Type.Object({
    docNo: Type.String(),
    paymentMethod: Type.Union([
      Type.Literal('Cash'),
      Type.Literal('Card'),
      Type.Literal('Split'),
      Type.Literal('Credit'),
    ]),
    paymentStatus: Type.Union([Type.Literal('Paid'), Type.Literal('Pending')]),
    discountCents: Type.Integer({ minimum: 0, default: 0 }),
    items: Type.Array(
      Type.Object({
        productId: Type.String(),
        qty: Type.Number({ exclusiveMinimum: 0 }),
        unitPriceCents: Type.Integer({ minimum: 0 }),
      })
    ),
  }),
});

interface SaleBody {
  tenantId: string;
  branchId: string;
  idempotencyKey: string;
  entityId: string;
  payload: {
    docNo: string;
    paymentMethod: 'Cash' | 'Card' | 'Split' | 'Credit';
    paymentStatus: 'Paid' | 'Pending';
    discountCents: number;
    items: Array<{ productId: string; qty: number; unitPriceCents: number }>;
  };
}

export const internalSyncRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<TypeBoxTypeProvider>();

  app.post(
    '/internal/sync/apply',
    { schema: { body: ApplySaleMutationSchema } },
    async (req) => {
      const { tenantId, branchId, idempotencyKey, entityId, payload } = req.body as SaleBody;

      // Check idempotency
      const existing = await db
        .selectFrom('processed_mutations')
        .select('idempotency_key')
        .where('idempotency_key', '=', idempotencyKey)
        .executeTakeFirst();

      if (existing) {
        return { status: 'acked' as const };
      }

      const itemsWithTotals = payload.items.map((item) => ({
        ...item,
        lineTotalCents: calcLineTotalCents(item.qty, item.unitPriceCents),
      }));
      const subtotalCents = itemsWithTotals.reduce((s, i) => s + i.lineTotalCents, 0);
      const gstCents = calcGstExclusiveCents(subtotalCents - payload.discountCents);
      const grandTotalCents = calcGrandTotalCents(subtotalCents, payload.discountCents, gstCents);

      await db
        .insertInto('sale_invoices')
        .values({
          id: entityId,
          tenant_id: tenantId,
          branch_id: branchId,
          doc_no: payload.docNo,
          payment_method: payload.paymentMethod,
          payment_status: payload.paymentStatus,
          subtotal_cents: subtotalCents,
          discount_cents: payload.discountCents,
          gst_cents: gstCents,
          grand_total_cents: grandTotalCents,
        })
        .onConflict((oc) => oc.columns(['id']).doNothing())
        .execute();

      for (const item of itemsWithTotals) {
        await db.insertInto('sale_invoice_items').values({
          invoice_id: entityId,
          product_id: item.productId,
          qty: item.qty,
          unit_price_cents: item.unitPriceCents,
          line_total_cents: item.lineTotalCents,
        });
      }

      const eventId = crypto.randomUUID();
      const eventEnvelope: SaleCompletedEvent = {
        eventId,
        subject: SUBJECTS.SALE_COMPLETED,
        occurredAt: new Date().toISOString(),
        branchId,
        data: {
          sourceType: 'sale_invoice',
          sourceId: entityId,
          docNo: payload.docNo,
          paymentMethod: payload.paymentMethod,
          paymentStatus: payload.paymentStatus,
          subtotalCents,
          discountCents: payload.discountCents,
          gstCents,
          grandTotalCents,
          items: itemsWithTotals,
        },
      };

      await db.insertInto('service_outbox').values({
        event_id: eventId,
        subject: SUBJECTS.SALE_COMPLETED,
        branch_id: branchId,
        payload: eventEnvelope,
        published_at: null,
      });

      await db.insertInto('processed_mutations').values({
        idempotency_key: idempotencyKey,
        entity_type: 'SaleInvoice',
        entity_id: entityId,
      });

      return { status: 'acked' as const };
    }
  );
};
