import type { FastifyPluginAsync } from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { sql } from 'kysely';
import { db } from '../db.js';

const ApplyInventoryMutationSchema = Type.Object({
  tenantId: Type.String(),
  branchId: Type.String(),
  idempotencyKey: Type.String(),
  entityId: Type.String(),
  payload: Type.Object({
    grnNo: Type.Optional(Type.String()),
    supplierId: Type.Optional(Type.String()),
    supplierInvoiceNo: Type.Optional(Type.String()),
    receivedDate: Type.Optional(Type.String()),
    subtotalCents: Type.Optional(Type.Integer()),
    taxCents: Type.Optional(Type.Integer()),
    totalCents: Type.Optional(Type.Integer()),
    paymentStatus: Type.Optional(Type.String()),
    dueDate: Type.Optional(Type.String()),
    items: Type.Optional(Type.Array(Type.Object({
      itemId: Type.String(),
      qtyReceived: Type.Number(),
      unitCostCents: Type.Integer(),
      lineTotalCents: Type.Integer(),
    }))),
    adjNo: Type.Optional(Type.String()),
    itemId: Type.Optional(Type.String()),
    reason: Type.Optional(Type.String()),
    deltaQty: Type.Optional(Type.Number()),
    notes: Type.Optional(Type.String()),
  }),
});

interface InventoryBody {
  tenantId: string;
  branchId: string;
  idempotencyKey: string;
  entityId: string;
  payload: {
    grnNo?: string;
    supplierId?: string;
    supplierInvoiceNo?: string;
    receivedDate?: string;
    subtotalCents?: number;
    taxCents?: number;
    totalCents?: number;
    paymentStatus?: string;
    dueDate?: string;
    items?: Array<{ itemId: string; qtyReceived: number; unitCostCents: number; lineTotalCents: number }>;
    adjNo?: string;
    itemId?: string;
    reason?: string;
    deltaQty?: number;
    notes?: string;
  };
}

export const internalSyncRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<TypeBoxTypeProvider>();

  app.post(
    '/internal/sync/apply',
    { schema: { body: ApplyInventoryMutationSchema } },
    async (req) => {
      const { tenantId, branchId, idempotencyKey, entityId, payload } = req.body as InventoryBody;

      const existing = await db
        .selectFrom('processed_mutations')
        .select('idempotency_key')
        .where('idempotency_key', '=', idempotencyKey)
        .executeTakeFirst();

      if (existing) {
        return { status: 'duplicate' as const };
      }

      if (payload.grnNo) {
        await db.insertInto('inv_grns').values({
          id: entityId,
          grn_no: payload.grnNo,
          branch_id: branchId,
          supplier_id: payload.supplierId ?? '',
          supplier_invoice_no: payload.supplierInvoiceNo ?? '',
          received_date: payload.receivedDate ? new Date(payload.receivedDate) : new Date(),
          subtotal_cents: payload.subtotalCents ?? 0,
          tax_cents: payload.taxCents ?? 0,
          total_cents: payload.totalCents ?? 0,
          payment_status: payload.paymentStatus ?? 'Unpaid',
        });

        for (const item of payload.items ?? []) {
          await db.insertInto('inv_stock_ledger').values({
            id: crypto.randomUUID(),
            branch_id: branchId,
            item_id: item.itemId,
            delta_qty: item.qtyReceived,
            ref_type: 'grn',
            ref_id: entityId,
          });

          await db
            .insertInto('inv_stock_balances')
            .values({
              branch_id: branchId,
              item_id: item.itemId,
              qty_on_hand: item.qtyReceived,
            })
            .onConflict((oc) =>
              oc.columns(['branch_id', 'item_id']).doUpdateSet({
                qty_on_hand: sql`inv_stock_balances.qty_on_hand + ${item.qtyReceived}`,
                updated_at: new Date(),
              })
            );
        }
      }

      if (payload.itemId && payload.deltaQty !== undefined && payload.reason) {
        await db.insertInto('inv_adjustments').values({
          id: entityId,
          adj_no: payload.adjNo ?? 'ADJ',
          branch_id: branchId,
          item_id: payload.itemId,
          reason: payload.reason,
          delta_qty: payload.deltaQty,
          notes: payload.notes ?? null,
        });

        await db
          .insertInto('inv_stock_balances')
          .values({
            branch_id: branchId,
            item_id: payload.itemId,
            qty_on_hand: payload.deltaQty,
          })
          .onConflict((oc) =>
            oc.columns(['branch_id', 'item_id']).doUpdateSet({
              qty_on_hand: sql`inv_stock_balances.qty_on_hand + ${payload.deltaQty}`,
              updated_at: new Date(),
            })
          );
      }

      await db.insertInto('processed_mutations').values({
        idempotency_key: idempotencyKey,
        entity_type: payload.grnNo ? 'grn' : 'stock_adjustment',
        entity_id: entityId,
        result_status: 'acked',
      });

      return { status: 'acked' as const };
    }
  );
};
