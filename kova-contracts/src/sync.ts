import { Type, type Static } from '@sinclair/typebox';

export const EntityType = Type.Union([
  Type.Literal('SaleInvoice'),
  Type.Literal('PosOrder'),
  Type.Literal('GoodsReceipt'),
  Type.Literal('StockCount'),
  Type.Literal('JournalEntry'),
]);

export const MutationOperation = Type.Union([
  Type.Literal('UPSERT'),
  Type.Literal('DELETE'),
]);

export const OutboxMutationSchema = Type.Object({
  outboxId: Type.String({ minLength: 1 }),
  entityType: EntityType,
  entityId: Type.String({ minLength: 1 }),
  operation: MutationOperation,
  payload: Type.Record(Type.String(), Type.Unknown()),
  idempotencyKey: Type.String({ minLength: 1 }),
  baseSeq: Type.Optional(Type.Integer({ minimum: 0 })),
});

export const SyncPushRequestSchema = Type.Object({
  mutations: Type.Array(OutboxMutationSchema, { minItems: 1, maxItems: 100 }),
});

export const SyncPushResultItemSchema = Type.Object({
  outboxId: Type.String(),
  status: Type.Union([
    Type.Literal('acked'),
    Type.Literal('conflict'),
    Type.Literal('rejected'),
  ]),
  serverSeq: Type.Optional(Type.Integer({ minimum: 0 })),
  serverSnapshot: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  reason: Type.Optional(Type.String()),
});

export const SyncPushResponseSchema = Type.Object({
  results: Type.Array(SyncPushResultItemSchema),
});

export const SyncPullQuerySchema = Type.Object({
  cursor: Type.Integer({ minimum: 0, default: 0 }),
  limit: Type.Integer({ minimum: 1, maximum: 500, default: 100 }),
});

export const ChangelogDeltaSchema = Type.Object({
  seq: Type.Integer({ minimum: 1 }),
  serviceName: Type.Union([
    Type.Literal('sale'),
    Type.Literal('inventory'),
    Type.Literal('accounting'),
  ]),
  entityType: Type.String(),
  entityId: Type.String(),
  operation: MutationOperation,
  data: Type.Record(Type.String(), Type.Unknown()),
  createdAt: Type.String(),
});

export const SyncPullResponseSchema = Type.Object({
  deltas: Type.Array(ChangelogDeltaSchema),
  nextCursor: Type.Integer({ minimum: 0 }),
  hasMore: Type.Boolean(),
});

export type SyncPushRequest = Static<typeof SyncPushRequestSchema>;
export type SyncPushResponse = Static<typeof SyncPushResponseSchema>;
export type SyncPushResultItem = Static<typeof SyncPushResultItemSchema>;
export type SyncPullQuery = Static<typeof SyncPullQuerySchema>;
export type SyncPullResponse = Static<typeof SyncPullResponseSchema>;
export type ChangelogDelta = Static<typeof ChangelogDeltaSchema>;
export type OutboxMutation = Static<typeof OutboxMutationSchema>;
