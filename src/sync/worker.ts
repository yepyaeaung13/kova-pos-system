import {
  applyEvents,
  cursorMap,
  getConfig,
  markAcked,
  markConflict,
  markInFlight,
  markRetry,
  pendingBatch,
  refreshCounts,
  type OutboxRow,
} from "../db/repo";
import { isoNow } from "../db/ulid";
import { patchSync, syncState } from "./state";

const PUSH_BATCH = 50;
const INTERVAL_MS = 15_000;

type ContractEntityType = "SaleInvoice" | "GoodsReceipt" | "StockCount" | "JournalEntry";
type ContractOperation = "UPSERT" | "DELETE";
type PaymentMethod = "Cash" | "Card" | "Split" | "Credit";
type AdjustmentReason = "Waste" | "Spoilage" | "Count Variance" | "Damage";

interface ContractMutation {
  entityType: ContractEntityType;
  payload: Record<string, unknown>;
}

let timer: ReturnType<typeof setInterval> | null = null;
let running = false;

export function setOnline(online: boolean): void {
  patchSync({ online });
  if (online) void syncOnce();
}

export function startSync(): void {
  if (timer !== null) return;
  timer = setInterval(() => void syncOnce(), INTERVAL_MS);
  void syncOnce();
}

export function stopSync(): void {
  if (timer !== null) clearInterval(timer);
  timer = null;
}

function backoffSeconds(attempts: number): number {
  return Math.min(300, 5 * Math.pow(2, Math.max(0, attempts)));
}

async function headers(branchId: string): Promise<Record<string, string>> {
  const token = (await getConfig("auth_token")) ?? "demo-token";
  const tenant = (await getConfig("tenant_id")) ?? "tenant_gulberg";
  const terminal = (await getConfig("terminal_id")) ?? "term_gul_01";
  return {
    "Content-Type": "application/json",
    Authorization: "Bearer " + token,
    "X-Tenant-Id": tenant,
    "X-Branch-Id": branchId,
    "X-Device-Id": terminal,
  };
}

/**
 * One push → pull → checkpoint cycle. Never throws: failures land in
 * `syncState` so the shell can show the queue and its last error.
 */
export async function syncNow(): Promise<void> {
  return syncOnce();
}

export async function syncOnce(): Promise<void> {
  if (running) return;
  if (!syncState().online) {
    patchSync({ busy: false, reachable: false });
    return;
  }
  running = true;
  patchSync({ busy: true });

  const gateway = syncState().gateway.replace(/\/+$/, "");
  let failed = false;

  try {
    await push(gateway);
    await pull(gateway);
    patchSync({
      reachable: true,
      lastError: null,
      lastSyncedAt: isoNow(),
    });
  } catch (error) {
    failed = true;
    patchSync({
      reachable: false,
      lastError: messageOf(error),
    });
  } finally {
    running = false;
    patchSync({ busy: false });
    await refreshCounts();
  }
}

async function push(gateway: string): Promise<void> {
  const rows = await pendingBatch(PUSH_BATCH);
  if (rows.length === 0) return;

  const ids = rows.map((row) => row.id);
  await markInFlight(ids);

  const branch = (await getConfig("branch_id")) ?? "branch_gulberg";
  const mapped = rows
    .map((row) => ({ row, mutation: toContractMutation(row) }))
    .filter((item): item is { row: OutboxRow; mutation: ContractMutation } => item.mutation !== null);
  const mappedIds = mapped.map((item) => item.row.id);

  // Rows with no backend contract type are local read models (orders, shifts,
  // bank lines) or duplicates of a mapped mutation (bills, expenses, invoice
  // voids now post a reversing JournalEntry). Ack them so the queue drains
  // instead of retrying forever.
  const localOnly = rows.filter((row) => !mapped.some((item) => item.row.id === row.id));
  if (localOnly.length > 0) await markAcked(localOnly.map((row) => row.id));
  if (mapped.length === 0) return;

  let response: Awaited<ReturnType<typeof fetch>>;
  try {
    response = await withTimeout(
      fetch(gateway + "/api/v1/sync/push", {
        method: "POST",
        headers: await headers(branch),
        body: JSON.stringify({
          mutations: mapped.map(({ row, mutation }) => ({
            outboxId: row.id,
            entityId: row.entity_id,
            idempotencyKey: row.idempotency_key,
            entityType: mutation.entityType,
            operation: contractOperation(row.operation),
            payload: mutation.payload,
          })),
        }),
      }),
      8_000,
    );
  } catch (error) {
    const message = "Gateway unreachable: " + messageOf(error);
    await markRetry(mappedIds, message, backoffSeconds(Math.max(...mapped.map((item) => item.row.attempts))));
    throw new Error(message);
  }

  if (!response.ok) {
    const message = "Push failed: HTTP " + response.status;
    await markRetry(mappedIds, message, backoffSeconds(Math.max(...mapped.map((item) => item.row.attempts))));
    throw new Error(message);
  }

  const body = (await response.json()) as {
    results?: {
      outboxId: string;
      status: string;
      reason?: string;
      serverSnapshot?: Record<string, unknown>;
    }[];
  };

  for (const result of body.results ?? []) {
    const row = mapped.find((candidate) => candidate.row.id === result.outboxId)?.row;
    if (!row) continue;
    if (result.status === "acked") {
      await markAcked([row.id]);
    } else if (result.status === "conflict" || result.status === "rejected") {
      await markConflict(row, result.reason ?? "Server rejected mutation", result.serverSnapshot ?? null);
    } else {
      await markRetry([row.id], "Retryable error", backoffSeconds(1));
    }
  }

  // Any mutation the server never answered stays pending for the next drain.
  const answered = new Set((body.results ?? []).map((result) => result.outboxId));
  const unanswered = mapped
    .map((item) => item.row.id)
    .filter((id) => !answered.has(id));
  if (unanswered.length > 0) {
    await markRetry(unanswered, "No result from server", backoffSeconds(1));
  }
}

async function pull(gateway: string): Promise<void> {
  const cursors = await cursorMap();
  const branch = (await getConfig("branch_id")) ?? "branch_gulberg";
  const cursor = Math.max(cursors.sale, cursors.inventory, cursors.accounting);

  const url =
    gateway +
    "/api/v1/sync/pull?cursor=" +
    cursor +
    "&limit=100";

  const response = await withTimeout(
    fetch(url, { headers: await headers(branch) }),
    8_000,
  );
  if (!response.ok) throw new Error("Pull failed: HTTP " + response.status);

  const body = (await response.json()) as {
    deltas?: {
      seq: number;
      serviceName: string;
      entityType: string;
      entityId: string;
      operation: string;
      data: Record<string, unknown>;
      createdAt: string;
    }[];
    nextCursor?: number;
  };

  const events = (body.deltas ?? []).map((delta) => ({
    service_name: delta.serviceName,
    seq: delta.seq,
    entity_type: delta.entityType,
    entity_id: delta.entityId,
    operation: delta.operation,
    data: delta.data ?? {},
  }));

  const nextCursor = Math.max(cursor, body.nextCursor ?? cursor);
  await applyEvents(events, {
    sale: nextCursor,
    inventory: nextCursor,
    accounting: nextCursor,
  });
  patchSync({ lastSeq: nextCursor });
}

/** Rejects after `ms` so a dead gateway cannot hold the worker. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error("timed out after " + ms + "ms")), ms);
    promise.then(
      (value) => {
        clearTimeout(id);
        resolve(value);
      },
      (error) => {
        clearTimeout(id);
        reject(error);
      },
    );
  });
}

function safeParse(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

function safeObject(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function num(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function contractOperation(operation: string): ContractOperation {
  return /delete/i.test(operation) ? "DELETE" : "UPSERT";
}

function paymentMethod(value: unknown): PaymentMethod {
  const raw = text(value).toLowerCase();
  if (raw.includes("split")) return "Split";
  if (raw.includes("card")) return "Card";
  if (raw.includes("wallet") || raw.includes("bank") || raw.includes("credit")) return "Credit";
  return "Cash";
}

function adjustmentReason(value: unknown): AdjustmentReason {
  const raw = text(value).toLowerCase();
  if (raw === "waste") return "Waste";
  if (raw === "damage") return "Damage";
  if (raw.includes("count")) return "Count Variance";
  if (raw.includes("expir") || raw.includes("spill") || raw.includes("spoil")) return "Spoilage";
  return "Count Variance";
}

/** Converts a local outbox row into the server's typed mutation contract. */
function toContractMutation(row: OutboxRow): ContractMutation | null {
  const payload = safeObject(safeParse(row.payload_json));

  if (/delete/i.test(row.operation)) {
    if (row.entity_type === "journal_entry") {
      return {
        entityType: "JournalEntry",
        payload: {
          entryNo: text(payload.entry_no ?? payload.entryNo, row.entity_id),
          deleted: true,
        },
      };
    }
    return null;
  }

  if (row.entity_type === "sale_invoice") {
    const items = Array.isArray(payload.items)
      ? payload.items.map((raw) => {
          const item = safeObject(raw);
          return {
            productId: text(item.product_id ?? item.productId),
            qty: num(item.qty),
            unitPriceCents: Math.round(num(item.unit_price_cents ?? item.unitPriceCents)),
          };
        }).filter((item) => item.productId && item.qty > 0)
      : [];
    if (items.length === 0) return null;

    const payments = Array.isArray(payload.payments) ? payload.payments : [];
    return {
      entityType: "SaleInvoice",
      payload: {
        docNo: text(payload.invoice_no ?? payload.docNo, row.entity_id),
        paymentMethod: paymentMethod(safeObject(payments[0]).method ?? payload.payment_method),
        paymentStatus: "Paid",
        discountCents: Math.round(num(payload.discount_cents ?? payload.discountCents)),
        items,
      },
    };
  }

  if (row.entity_type === "grn") {
    const lines = Array.isArray(payload.lines) ? payload.lines : [];
    const items = lines.map((raw) => {
      const line = safeObject(raw);
      const qty = num(line.qty ?? line.qtyReceived);
      const unitCostCents = Math.round(num(line.cost_cents ?? line.unitCostCents));
      return {
        itemId: text(line.item_id ?? line.sku ?? line.itemId),
        qtyReceived: qty,
        unitCostCents,
        lineTotalCents: Math.round(num(line.line_total_cents ?? qty * unitCostCents)),
      };
    }).filter((item) => item.itemId && item.qtyReceived > 0);
    if (items.length === 0) return null;

    const subtotalCents = items.reduce((sum, item) => sum + item.lineTotalCents, 0);
    const taxCents = Math.round(num(payload.tax_cents ?? subtotalCents * 0.08));
    return {
      entityType: "GoodsReceipt",
      payload: {
        grnNo: text(payload.grn_no ?? payload.grnNo, row.entity_id),
        supplierId: text(payload.supplier_id ?? payload.supplierId, "sup-1"),
        supplierInvoiceNo: text(payload.invoice_no ?? payload.supplierInvoiceNo, row.entity_id),
        receivedDate: row.created_at,
        subtotalCents,
        taxCents,
        totalCents: subtotalCents + taxCents,
        paymentStatus: "Unpaid",
        items,
      },
    };
  }

  if (row.entity_type === "stock_adjustment") {
    const itemId = text(payload.item_id ?? payload.sku ?? payload.itemId);
    const deltaQty = num(payload.delta_qty ?? payload.deltaQty);
    const reason = adjustmentReason(payload.reason);
    if (!itemId || deltaQty === 0) return null;
    return {
      entityType: "StockCount",
      payload: {
        adjNo: text(payload.adj_no ?? payload.adjNo, row.entity_id),
        itemId,
        reason,
        deltaQty,
        notes: text(payload.notes),
      },
    };
  }

  if (row.entity_type === "journal_entry" || row.entity_type === "refund") {
    const lines = Array.isArray(payload.lines)
      ? payload.lines.map((raw) => {
          const line = safeObject(raw);
          return {
            accountCode: text(line.account_code ?? line.accountCode).replace(/^acct_/, ""),
            debitCents: Math.round(num(line.debit_cents ?? line.debitCents)),
            creditCents: Math.round(num(line.credit_cents ?? line.creditCents)),
          };
        }).filter((line) => line.accountCode && (line.debitCents > 0 || line.creditCents > 0))
      : [];
    if (lines.length < 2) return null;
    return {
      entityType: "JournalEntry",
      payload: {
        entryNo: text(payload.entry_no ?? payload.entryNo, row.entity_id),
        memo: text(
          payload.memo,
          row.entity_type === "refund" ? "Refund " + text(payload.invoice_no) : "Kova journal entry",
        ),
        lines,
      },
    };
  }

  return null;
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
