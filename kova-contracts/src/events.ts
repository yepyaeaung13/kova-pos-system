import { Type, type Static } from '@sinclair/typebox';
import { TypeCompiler } from '@sinclair/typebox/compiler';

export const SUBJECTS = {
  SALE_COMPLETED: 'kova.sale.completed',
  INVENTORY_GRN_RECEIVED: 'kova.inventory.grn_received',
  INVENTORY_STOCK_ADJUSTED: 'kova.inventory.stock_adjusted',
} as const;

export const SaleCompletedDataSchema = Type.Object(
  {
    sourceType: Type.Union([Type.Literal('sale_invoice'), Type.Literal('pos_order')]),
    sourceId: Type.String(),
    docNo: Type.String(),
    paymentMethod: Type.Union([
      Type.Literal('Cash'),
      Type.Literal('Card'),
      Type.Literal('Split'),
      Type.Literal('Credit'),
    ]),
    paymentStatus: Type.Union([Type.Literal('Paid'), Type.Literal('Pending')]),
    subtotalCents: Type.Integer({ minimum: 0 }),
    discountCents: Type.Integer({ minimum: 0 }),
    gstCents: Type.Integer({ minimum: 0 }),
    grandTotalCents: Type.Integer({ minimum: 0 }),
    items: Type.Array(
      Type.Object(
        {
          productId: Type.String(),
          qty: Type.Number({ exclusiveMinimum: 0 }),
          unitPriceCents: Type.Integer({ minimum: 0 }),
          lineTotalCents: Type.Integer({ minimum: 0 }),
        },
        { additionalProperties: true }
      )
    ),
  },
  { additionalProperties: true }
);

export const GrnReceivedDataSchema = Type.Object(
  {
    grnId: Type.String(),
    grnNo: Type.String(),
    supplierId: Type.String(),
    supplierInvoiceNo: Type.String(),
    subtotalCents: Type.Integer({ minimum: 0 }),
    taxCents: Type.Integer({ minimum: 0 }),
    totalCents: Type.Integer({ minimum: 0 }),
    paymentStatus: Type.Union([Type.Literal('Paid'), Type.Literal('Unpaid')]),
    dueDate: Type.Optional(Type.String()),
  },
  { additionalProperties: true }
);

export const StockAdjustedDataSchema = Type.Object(
  {
    adjId: Type.String(),
    adjNo: Type.String(),
    itemId: Type.String(),
    reason: Type.Union([Type.Literal('Waste'), Type.Literal('Spoilage'), Type.Literal('Count Variance'), Type.Literal('Damage')]),
    deltaQty: Type.Number(),
    costImpactCents: Type.Optional(Type.Integer()),
  },
  { additionalProperties: true }
);

export const KovaEventEnvelope = <T extends ReturnType<typeof Type.Object>>(dataSchema: T) =>
  Type.Object(
    {
      eventId: Type.String({ minLength: 1 }),
      subject: Type.String(),
      occurredAt: Type.String(),
      branchId: Type.String(),
      correlationId: Type.Optional(Type.String()),
      data: dataSchema,
    },
    { additionalProperties: true }
  );

export const SaleCompletedEventSchema = KovaEventEnvelope(SaleCompletedDataSchema);
export const GrnReceivedEventSchema = KovaEventEnvelope(GrnReceivedDataSchema);
export const StockAdjustedEventSchema = KovaEventEnvelope(StockAdjustedDataSchema);

export type SaleCompletedEvent = Static<typeof SaleCompletedEventSchema>;
export type GrnReceivedEvent = Static<typeof GrnReceivedEventSchema>;
export type StockAdjustedEvent = Static<typeof StockAdjustedEventSchema>;

// Compiled once at service boot for zero-overhead NATS payload validation
export const validateSaleCompletedEvent = TypeCompiler.Compile(SaleCompletedEventSchema);
export const validateGrnReceivedEvent = TypeCompiler.Compile(GrnReceivedEventSchema);
export const validateStockAdjustedEvent = TypeCompiler.Compile(StockAdjustedEventSchema);
