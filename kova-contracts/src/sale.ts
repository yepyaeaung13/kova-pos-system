import { Type, type Static } from '@sinclair/typebox';

export const PaymentMethod = Type.Union([
  Type.Literal('Cash'),
  Type.Literal('Card'),
  Type.Literal('Split'),
  Type.Literal('Credit'),
]);

export const PaymentStatus = Type.Union([Type.Literal('Paid'), Type.Literal('Pending')]);

export const SaleInvoiceSchema = Type.Object({
  id: Type.String(),
  tenantId: Type.String(),
  branchId: Type.String(),
  docNo: Type.String(),
  orderId: Type.Optional(Type.String()),
  customerName: Type.String(),
  customerNtn: Type.Optional(Type.String()),
  paperSize: Type.Union([Type.Literal('A4'), Type.Literal('A5'), Type.Literal('80mm')]),
  paymentMethod: PaymentMethod,
  paymentStatus: PaymentStatus,
  subtotalCents: Type.Integer({ minimum: 0 }),
  discountCents: Type.Integer({ minimum: 0, default: 0 }),
  gstCents: Type.Integer({ minimum: 0 }),
  grandTotalCents: Type.Integer({ minimum: 0 }),
  status: Type.Union([Type.Literal('Paid'), Type.Literal('Unpaid'), Type.Literal('Voided')]),
  issuedAt: Type.String(),
});

export const SaleInvoiceItemSchema = Type.Object({
  id: Type.String(),
  invoiceId: Type.String(),
  productId: Type.String(),
  productName: Type.String(),
  modifiersJson: Type.Optional(Type.String()),
  qty: Type.Number(),
  unitPriceCents: Type.Integer({ minimum: 0 }),
  lineTotalCents: Type.Integer({ minimum: 0 }),
});

export type SaleInvoice = Static<typeof SaleInvoiceSchema>;
export type SaleInvoiceItem = Static<typeof SaleInvoiceItemSchema>;
