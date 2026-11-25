import { Type, type Static } from '@sinclair/typebox';

export const GrnSchema = Type.Object({
  id: Type.String(),
  branchId: Type.String(),
  grnNo: Type.String(),
  supplierId: Type.String(),
  supplierInvoiceNo: Type.String(),
  receivedDate: Type.String(),
  subtotalCents: Type.Integer({ minimum: 0 }),
  taxCents: Type.Integer({ minimum: 0 }),
  totalCents: Type.Integer({ minimum: 0 }),
  paymentStatus: Type.Union([Type.Literal('Paid'), Type.Literal('Unpaid')]),
  dueDate: Type.Optional(Type.String()),
  createdAt: Type.String(),
});

export const GrnItemSchema = Type.Object({
  id: Type.String(),
  grnId: Type.String(),
  itemId: Type.String(),
  qtyReceived: Type.Number(),
  unitCostCents: Type.Integer({ minimum: 0 }),
  lineTotalCents: Type.Integer({ minimum: 0 }),
});

export const StockAdjustmentSchema = Type.Object({
  id: Type.String(),
  branchId: Type.String(),
  itemId: Type.String(),
  reason: Type.Union([Type.Literal('Waste'), Type.Literal('Spoilage'), Type.Literal('Count Variance'), Type.Literal('Damage')]),
  deltaQty: Type.Number(),
  notes: Type.Optional(Type.String()),
  createdAt: Type.String(),
});

export const RecipeSchema = Type.Object({
  id: Type.String(),
  productId: Type.String(),
  productName: Type.String(),
  updatedAt: Type.String(),
});

export const RecipeLineSchema = Type.Object({
  id: Type.String(),
  recipeId: Type.String(),
  itemId: Type.String(),
  qtyRequired: Type.Number(),
});

export type Grn = Static<typeof GrnSchema>;
export type GrnItem = Static<typeof GrnItemSchema>;
export type StockAdjustment = Static<typeof StockAdjustmentSchema>;
export type Recipe = Static<typeof RecipeSchema>;
export type RecipeLine = Static<typeof RecipeLineSchema>;
