import type { FastifyPluginAsync } from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { sql } from 'kysely';
import { SUBJECTS, type GrnReceivedEvent, type StockAdjustedEvent } from '@kova/contracts';
import { db } from '../db.js';

const ADJUSTMENT_REASONS = ['Waste', 'Spoilage', 'Count Variance', 'Damage'] as const;
type AdjustmentReason = (typeof ADJUSTMENT_REASONS)[number];

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
    async (req, reply) => {
      const { tenantId, branchId, idempotencyKey, entityId, payload } = req.body as InventoryBody;
      const headerTenantId = String(req.headers['x-tenant-id'] ?? '');
      const headerBranchId = String(req.headers['x-branch-id'] ?? '');
      if (!headerTenantId || !headerBranchId || headerTenantId !== tenantId || headerBranchId !== branchId) {
        return reply.code(403).send({ status: 'rejected', reason: 'Tenant/branch header mismatch' } as never);
      }

      const isGrn = Boolean(payload.grnNo);
      const isAdjustment = Boolean(payload.itemId && payload.deltaQty !== undefined && payload.reason);
      if (!isGrn && !isAdjustment) {
        return reply.code(400).send({ status: 'rejected', reason: 'Unrecognized inventory mutation payload' } as never);
      }

      let reason: AdjustmentReason | undefined;
      if (isAdjustment) {
        reason = ADJUSTMENT_REASONS.find((r) => r === payload.reason);
        if (!reason) {
          return reply.code(400).send({ status: 'rejected', reason: 'Invalid adjustment reason' } as never);
        }
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

        let entityType = 'GoodsReceipt';

        if (isGrn) {
          await trx
            .insertInto('inv_grns')
            .values({
              id: entityId,
              grn_no: payload.grnNo!,
              branch_id: branchId,
              supplier_id: payload.supplierId ?? '',
              supplier_invoice_no: payload.supplierInvoiceNo ?? '',
              received_date: payload.receivedDate ? new Date(payload.receivedDate) : new Date(),
              subtotal_cents: payload.subtotalCents ?? 0,
              tax_cents: payload.taxCents ?? 0,
              total_cents: payload.totalCents ?? 0,
              payment_status: payload.paymentStatus ?? 'Unpaid',
            })
            .execute();

          for (const item of payload.items ?? []) {
            await trx
              .insertInto('inv_grn_items')
              .values({
                id: crypto.randomUUID(),
                grn_id: entityId,
                item_id: item.itemId,
                qty_received: item.qtyReceived,
                unit_cost_cents: item.unitCostCents,
                line_total_cents: item.lineTotalCents,
              })
              .execute();

            await trx
              .insertInto('inv_stock_ledger')
              .values({
                id: crypto.randomUUID(),
                branch_id: branchId,
                item_id: item.itemId,
                delta_qty: item.qtyReceived,
                ref_type: 'grn',
                ref_id: entityId,
              })
              .execute();

            await trx
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
              )
              .execute();
          }

          const grnEvent: GrnReceivedEvent = {
            eventId: crypto.randomUUID(),
            subject: SUBJECTS.INVENTORY_GRN_RECEIVED,
            occurredAt: new Date().toISOString(),
            branchId,
            data: {
              grnId: entityId,
              grnNo: payload.grnNo!,
              supplierId: payload.supplierId ?? '',
              supplierInvoiceNo: payload.supplierInvoiceNo ?? '',
              subtotalCents: payload.subtotalCents ?? 0,
              taxCents: payload.taxCents ?? 0,
              totalCents: payload.totalCents ?? 0,
              paymentStatus: payload.paymentStatus === 'Paid' ? 'Paid' : 'Unpaid',
              ...(payload.dueDate ? { dueDate: payload.dueDate } : {}),
            },
          };

          await trx
            .insertInto('service_outbox')
            .values({
              event_id: grnEvent.eventId,
              subject: SUBJECTS.INVENTORY_GRN_RECEIVED,
              branch_id: branchId,
              payload: grnEvent,
              published_at: null,
            })
            .execute();
        } else if (reason) {
          entityType = 'StockCount';
          const deltaQty = payload.deltaQty!;

          await trx
            .insertInto('inv_adjustments')
            .values({
              id: entityId,
              adj_no: payload.adjNo ?? 'ADJ',
              branch_id: branchId,
              item_id: payload.itemId!,
              reason,
              delta_qty: deltaQty,
              notes: payload.notes ?? null,
            })
            .execute();

          await trx
            .insertInto('inv_stock_balances')
            .values({
              branch_id: branchId,
              item_id: payload.itemId!,
              qty_on_hand: deltaQty,
            })
            .onConflict((oc) =>
              oc.columns(['branch_id', 'item_id']).doUpdateSet({
                qty_on_hand: sql`inv_stock_balances.qty_on_hand + ${deltaQty}`,
                updated_at: new Date(),
              })
            )
            .execute();

          const adjustmentEvent: StockAdjustedEvent = {
            eventId: crypto.randomUUID(),
            subject: SUBJECTS.INVENTORY_STOCK_ADJUSTED,
            occurredAt: new Date().toISOString(),
            branchId,
            data: {
              adjId: entityId,
              adjNo: payload.adjNo ?? 'ADJ',
              itemId: payload.itemId!,
              reason,
              deltaQty,
            },
          };

          await trx
            .insertInto('service_outbox')
            .values({
              event_id: adjustmentEvent.eventId,
              subject: SUBJECTS.INVENTORY_STOCK_ADJUSTED,
              branch_id: branchId,
              payload: adjustmentEvent,
              published_at: null,
            })
            .execute();
        }

        await trx
          .insertInto('processed_mutations')
          .values({
            idempotency_key: idempotencyKey,
            entity_type: entityType,
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
