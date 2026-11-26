import { exec, query, sqlJson, sqlText } from "./sqlite";
import { migrations } from "./schema";
import { isoNow, rowId, ulid } from "./ulid";
import { patchSync, syncState } from "../sync/state";
import { customers, products } from "../data/mock";
import { accounts, bankLines, expenses, payables, recipes, stockItems, suppliers, type Adjustment, type Supplier } from "../data/ops";

/** Branch/terminal identity the outbox stamps on every mutation. */
const BRANCH_ID = "branch_gulberg";
const TERMINAL_ID = "term_gul_01";
const DOC_PREFIX = "GUL-T01";
const CASHIER_ID = "cashier_sara";

export interface SaleLineWrite {
  productId: string;
  name: string;
  qty: number;
  priceCents: number;
  note: string;
}

export interface SaleWrite {
  invoiceNo: string;
  customerName: string;
  customerNtn: string | null;
  channel: string;
  table: string;
  method: string;
  lines: SaleLineWrite[];
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  tipCents: number;
  payments?: { method: string; amountCents: number }[];
  tenderedCents: number;
  changeCents: number;
  promoCode: string | null;
  customerId: string | null;
  issuedAt: string;
}

export interface OutboxRow {
  id: string;
  service_name: string;
  entity_type: string;
  entity_id: string;
  operation: string;
  payload_json: string;
  idempotency_key: string;
  attempts: number;
  next_retry_at: string | null;
  last_error: string | null;
  status: string;
  created_at: string;
}

export interface ConflictRow {
  id: string;
  outbox_id: string;
  entity_type: string;
  entity_id: string;
  reason: string;
  server_snapshot_json: string | null;
  resolved: number;
  created_at: string;
}

export interface SaleRow {
  invoice_no: string;
  issued_at: string;
  customer_name: string;
  status: string;
  grand_total_cents: number;
  gst_cents: number;
  subtotal_cents: number;
  channel: string;
  table_label: string | null;
  payment_method: string | null;
  items: number;
}

/* ——— Serialized writes and cached counters ——— */

let chain: Promise<unknown> = Promise.resolve();

/** Runs `fn` after every earlier write, so counters and batches stay ordered. */
function withWrite<T>(fn: () => Promise<T>): Promise<T> {
  const next = chain.then(fn, fn);
  chain = next.catch(() => undefined);
  return next;
}

const counters = { inv: 134, order: 1049, je: 418, adj: 61, grn: 118 };

function invoiceNo(seq: number): string {
  return "INV-" + DOC_PREFIX + "-" + String(seq).padStart(4, "0");
}

/** Reserves the next invoice number; persists the sequence in the background. */
export function allocateInvoiceNo(): string {
  counters.inv += 1;
  void persistCounter("next_inv_seq", counters.inv);
  return invoiceNo(counters.inv);
}

/** Reserves the next order number (`#1050`). */
export function allocateOrderNo(): string {
  counters.order += 1;
  void persistCounter("next_order_seq", counters.order);
  return "#" + counters.order;
}

function persistCounter(key: string, value: number): Promise<void> {
  return withWrite(() =>
    exec(
      "UPDATE sync_terminal_config SET value = " +
        sqlText(String(value)) +
        " WHERE key = " +
        sqlText(key) +
        ";",
    ),
  ).catch(() => undefined);
}

/* ——— Configuration ——— */

async function configMap(): Promise<Record<string, string>> {
  const rows = await query<{ key: string; value: string }>(
    "SELECT key, value FROM sync_terminal_config;",
  );
  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value;
  return map;
}

export async function getConfig(key: string): Promise<string | null> {
  const rows = await query<{ value: string }>(
    "SELECT value FROM sync_terminal_config WHERE key = " + sqlText(key) + ";",
  );
  return rows[0]?.value ?? null;
}

export async function setConfig(key: string, value: string): Promise<void> {
  await withWrite(() =>
    exec(
      "INSERT INTO sync_terminal_config (key, value) VALUES (" +
        sqlText(key) +
        ", " +
        sqlText(value) +
        ") ON CONFLICT(key) DO UPDATE SET value = excluded.value;",
    ),
  );
}

/** The account ids journal entries post against, by code. */
const accountIds: Record<string, string> = {};

/* ——— Startup ——— */

function seedSale(): string {
  const now = isoNow();
  const shiftId = "shift_" + ulid().slice(-10);
  const lines: string[] = [];

  lines.push(
    "INSERT OR IGNORE INTO pos_shifts (id, branch_id, terminal_id, cashier_id, opening_float_cents, status, opened_at) VALUES (" +
      [shiftId, BRANCH_ID, TERMINAL_ID, CASHIER_ID, "50000", "open", now]
        .map(sqlText)
        .join(", ") +
      ");",
  );

  lines.push(
    "INSERT OR IGNORE INTO sync_terminal_config (key, value) VALUES " +
      [
        ["branch_id", BRANCH_ID],
        ["tenant_id", "tenant_gulberg"],
        ["terminal_id", TERMINAL_ID],
        ["doc_prefix", DOC_PREFIX],
        ["cashier_id", CASHIER_ID],
        ["next_inv_seq", String(counters.inv)],
        ["next_order_seq", String(counters.order)],
        ["next_je_seq", String(counters.je)],
        ["next_adj_seq", String(counters.adj)],
        ["next_grn_seq", String(counters.grn)],
        ["current_shift_id", shiftId],
        ["gateway_url", "http://127.0.0.1:8080"],
      ]
        .map(([key, value]) => "(" + sqlText(key) + ", " + sqlText(value) + ")")
        .join(", ") +
      " ON CONFLICT(key) DO NOTHING;",
  );

  for (const product of products) {
    lines.push(
      "INSERT OR IGNORE INTO pos_products (id, name, category, note, price_cents, emoji, tint, badge, sold_today) VALUES (" +
        [
          sqlText(product.id),
          sqlText(product.name),
          sqlText(product.category),
          sqlText(product.note),
          String(Math.round(product.price * 100)),
          sqlText(product.emoji),
          sqlText(product.tint),
          product.badge ? sqlText(product.badge) : "NULL",
          String(product.soldToday),
        ].join(", ") +
        ");",
    );
  }

  for (const customer of customers) {
    lines.push(
      "INSERT OR IGNORE INTO pos_customers (id, name, phone, loyalty_stamps, store_credit_cents, tier, updated_at) VALUES (" +
        [
          sqlText(customer.id),
          sqlText(customer.name),
          sqlText(customer.phone),
          String(customer.stamps),
          String(Math.round(customer.spend * 2)),
          sqlText(customer.tier === "Gold" ? "VIP" : "Member"),
          now,
        ]
          .map(sqlText)
          .join(", ") +
        ");",
    );
  }

  for (const supplier of suppliers) {
    lines.push(
      "INSERT OR IGNORE INTO inv_suppliers (id, name, contact_name, phone, payment_terms, updated_at) VALUES (" +
        [
          supplier.id,
          supplier.name,
          supplier.contact_name,
          supplier.phone,
          "Net 7",
          now,
        ]
          .map(sqlText)
          .join(", ") +
        ");",
    );
  }

  for (const item of stockItems) {
    const supplierId =
      suppliers.find((supplier) => supplier.name === item.supplier)?.id ?? null;
    lines.push(
      "INSERT OR IGNORE INTO inv_items (id, sku, name, category, unit, reorder_level, cost_cents, supplier_id, updated_at) VALUES (" +
        [
          "item_" + item.sku.toLowerCase(),
          item.sku,
          item.name,
          item.category,
          item.unit,
          String(item.par),
          String(Math.round(item.unitCost * 100)),
          supplierId ?? "NULL",
          now,
        ]
          .map((value) => (value === "NULL" ? "NULL" : sqlText(value)))
          .join(", ") +
        ");",
    );
    lines.push(
      "INSERT OR IGNORE INTO inv_stock_balances (branch_id, item_id, qty_on_hand, updated_at) VALUES (" +
        [
          BRANCH_ID,
          "item_" + item.sku.toLowerCase(),
          String(item.onHand),
          now,
        ]
          .map(sqlText)
          .join(", ") +
        ");",
    );
  }

  for (const account of accounts) {
    lines.push(
      "INSERT OR IGNORE INTO acc_accounts (id, code, name, type, balance_cents, updated_at) VALUES (" +
        [
          "acct_" + account.code,
          account.code,
          account.name,
          account.type,
          String(Math.round(account.balance * 100)),
          now,
        ]
          .map(sqlText)
          .join(", ") +
        ");",
    );
  }

  return lines.join("\n");
}

function seedDemoOutbox(): string {
  const now = isoNow();
  const rows: [string, string, string, string, string, unknown, string][] = [
    [
      "seed-outbox-1",
      "sale",
      "sale_invoice",
      "seed-invoice-1049",
      "INSERT",
      {
        invoice_no: "INV-GUL-T01-0134",
        customer_name: "Ayesha Khan",
        subtotal_cents: 1315,
        gst_cents: 105,
        grand_total_cents: 1420,
      },
      "acked",
    ],
    [
      "seed-outbox-2",
      "sale",
      "pos_order",
      "seed-order-1049",
      "INSERT",
      {
        order_no: "#1049",
        channel: "Dine-in",
        table_label: "Table 4",
        total_cents: 1420,
      },
      "acked",
    ],
    [
      "seed-outbox-3",
      "inventory",
      "stock_adjustment",
      "seed-adj-0061",
      "INSERT",
      { adj_no: "ADJ-2026-0061", reason: "Waste", delta_qty: -2 },
      "pending",
    ],
  ];

  return rows
    .map(
      ([id, service, type, entity, op, payload, status]) =>
        "INSERT OR IGNORE INTO sync_outbox (id, service_name, entity_type, entity_id, operation, payload_json, idempotency_key, branch_id, terminal_id, created_at, status) VALUES (" +
        [
          id,
          service,
          type,
          entity,
          op,
          JSON.stringify(payload),
          TERMINAL_ID + ":" + type + ":" + entity,
          BRANCH_ID,
          TERMINAL_ID,
          now,
          status,
        ]
          .map(sqlText)
          .join(", ") +
        ");",
    )
    .join("\n");
}

let initTask: Promise<boolean> | null = null;

/** Opens, migrates and seeds once per process, even with concurrent callers. */
export function initDb(): Promise<boolean> {
  if (!initTask) initTask = runInit();
  return initTask;
}

async function runInit(): Promise<boolean> {
  try {
    await exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = 5000;
      PRAGMA temp_store = MEMORY;
    `);

    await exec(
      "CREATE TABLE IF NOT EXISTS schema_migrations (id INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL);",
    );

    const applied = await query<{ id: number }>(
      "SELECT id FROM schema_migrations ORDER BY id;",
    );
    const done = new Set(applied.map((row) => row.id));

    for (const migration of migrations) {
      if (done.has(migration.id)) continue;
      await exec(
        "BEGIN IMMEDIATE;\n" +
          migration.sql +
          "\nINSERT OR IGNORE INTO schema_migrations (id, name, applied_at) VALUES (" +
          migration.id +
          ", " +
          sqlText(migration.name) +
          ", " +
          sqlText(isoNow()) +
          ");\nCOMMIT;",
      );
    }

    const config = await configMap();
    counters.inv = Number(config.next_inv_seq ?? 135);
    counters.order = Number(config.next_order_seq ?? 1050);
    counters.je = Number(config.next_je_seq ?? 419);
    counters.adj = Number(config.next_adj_seq ?? 61);
    counters.grn = Number(config.next_grn_seq ?? 118);

    // A push cut short by a crash leaves rows marked in flight; they are
    // retried on the next boot rather than stranded.
    await exec(
      "UPDATE sync_outbox SET status = 'pending' WHERE status = 'in_flight';",
    );

    const versionRows = await query<{ version: string }>(
      "SELECT sqlite_version() AS version;",
    );
    const hasSeed = await query<{ n: number }>(
      "SELECT COUNT(*) AS n FROM sync_terminal_config WHERE key = 'branch_id';",
    );
    if ((hasSeed[0]?.n ?? 0) === 0) {
      await exec("BEGIN IMMEDIATE;\n" + seedSale() + "\nCOMMIT;");
    }

    const outboxRows = await query<{ n: number }>(
      "SELECT COUNT(*) AS n FROM sync_outbox;",
    );
    if ((outboxRows[0]?.n ?? 0) === 0) {
      await exec("BEGIN IMMEDIATE;\n" + seedDemoOutbox() + "\nCOMMIT;");
    }

    const ledgerRows = await query<{ n: number }>(
      "SELECT COUNT(*) AS n FROM inv_stock_ledger;",
    );
    if ((ledgerRows[0]?.n ?? 0) === 0) {
      await exec("BEGIN IMMEDIATE;\n" + seedLedger() + "\nCOMMIT;");
    }

    const billRows = await query<{ n: number }>(
      "SELECT COUNT(*) AS n FROM acc_vendor_bills;",
    );
    if ((billRows[0]?.n ?? 0) === 0) {
      await exec("BEGIN IMMEDIATE;\n" + seedVendorBills() + "\nCOMMIT;");
    }

    const bankRows = await query<{ n: number }>(
      "SELECT COUNT(*) AS n FROM acc_bank_lines;",
    );
    if ((bankRows[0]?.n ?? 0) === 0) {
      await exec("BEGIN IMMEDIATE;\n" + seedBankLines() + "\nCOMMIT;");
    }

    const expenseRows = await query<{ n: number }>(
      "SELECT COUNT(*) AS n FROM acc_expenses;",
    );
    if ((expenseRows[0]?.n ?? 0) === 0) {
      await exec("BEGIN IMMEDIATE;\n" + seedExpenses() + "\nCOMMIT;");
    }

    await seedTransfers();

    await seedRecipes();

    await seedSuppliers();

    // Backfill supplier links on databases created before the item_supplier migration.
    for (const item of stockItems) {
      const supplierId =
        suppliers.find((supplier) => supplier.name === item.supplier)?.id ?? null;
      if (!supplierId) continue;
      await exec(
        "UPDATE inv_items SET supplier_id = " +
          sqlText(supplierId) +
          " WHERE sku = " +
          sqlText(item.sku) +
          " AND (supplier_id IS NULL OR supplier_id = '');",
      );
    }

    const accRows = await query<{ id: string; code: string }>(
      "SELECT id, code FROM acc_accounts;",
    );
    for (const row of accRows) accountIds[row.code] = row.id;

    const config2 = await configMap();
    patchSync({
      dbReady: true,
      dbVersion: versionRows[0]?.version ?? null,
      dbPath: syncState().dbPath,
      gateway: config2.gateway_url ?? syncState().gateway,
      lastError: null,
    });
    await refreshCounts();
    return true;
  } catch (error) {
    patchSync({
      dbReady: false,
      lastError: "Local database unavailable: " + messageOf(error),
    });
    console.log("local db init failed: " + messageOf(error));
    return false;
  }
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/* ——— Counts ——— */

export async function refreshCounts(): Promise<void> {
  try {
    const rows = await query<{ pending: number; conflicts: number; acked: number }>(
      "SELECT " +
        "(SELECT COUNT(*) FROM sync_outbox WHERE status IN ('pending','in_flight')) AS pending, " +
        "(SELECT COUNT(*) FROM sync_conflicts WHERE resolved = 0) AS conflicts, " +
        "(SELECT COUNT(*) FROM sync_outbox WHERE status = 'acked') AS acked;",
    );
    const cursors = await query<{ last_seq: number; last_synced_at: string | null }>(
      "SELECT MAX(last_seq) AS last_seq, MAX(last_synced_at) AS last_synced_at FROM sync_cursors;",
    );
    patchSync({
      pending: Number(rows[0]?.pending ?? 0),
      conflicts: Number(rows[0]?.conflicts ?? 0),
      lastSeq: Number(cursors[0]?.last_seq ?? 0),
      lastSyncedAt: cursors[0]?.last_synced_at ?? syncState().lastSyncedAt,
    });
  } catch {
    // The database may not be ready yet; the screen keeps its last values.
  }
}

/* ——— Sale ——— */

export async function writeSale(input: SaleWrite): Promise<void> {
  const orderId = ulid();
  const invoiceId = ulid();
  const now = input.issuedAt;
  const shift = await getConfig("current_shift_id");

  const orderNo = allocateOrderNo();
  const jeNo = "JE-" + new Date(now).getFullYear() + "-" + String(counters.je + 1).padStart(4, "0");
  counters.je += 1;

  const paymentMethod =
    input.method === "Card" ? "Card" : input.method === "QR / Wallet" ? "Wallet" : "Cash";

  const paymentRows =
    input.payments && input.payments.length > 0
      ? input.payments
      : [{ method: paymentMethod, amountCents: input.totalCents }];
  const accountFor = (method: string) =>
    method === "Cash" ? "acct_1000" : "acct_1020";
  const gross = input.totalCents;
  const netSales = input.subtotalCents - input.discountCents;

  const itemsSql = input.lines
    .map(
      (line) =>
        "INSERT INTO pos_order_items (id, order_id, product_id, product_name, modifiers_json, qty, unit_price_cents, line_total_cents) VALUES (" +
        [
          rowId("oi"),
          orderId,
          line.productId,
          line.name,
          JSON.stringify(line.note ? { note: line.note } : {}),
          String(line.qty),
          String(line.priceCents),
          String(line.priceCents * line.qty),
        ]
          .map(sqlText)
          .join(", ") +
        ");",
    )
    .join("\n");

  const invoiceItemsSql = input.lines
    .map(
      (line) =>
        "INSERT INTO pos_sale_invoice_items (id, invoice_id, product_id, description, qty, unit_price_cents, amount_cents) VALUES (" +
        [
          rowId("ii"),
          invoiceId,
          line.productId,
          line.name,
          String(line.qty),
          String(line.priceCents),
          String(line.priceCents * line.qty),
        ]
          .map(sqlText)
          .join(", ") +
        ");",
    )
    .join("\n");

  const salePayload = {
    invoice_no: input.invoiceNo,
    customer_name: input.customerName,
    customer_ntn: input.customerNtn,
    paper_size: "A4",
    subtotal_cents: input.subtotalCents,
    discount_cents: input.discountCents,
    gst_cents: input.taxCents,
    grand_total_cents: input.totalCents,
    tip_cents: input.tipCents,
    payments: paymentRows.map((row) => ({
      method: row.method,
      amount_cents: row.amountCents,
    })),
    promo_code: input.promoCode,
    items: input.lines.map((line) => ({
      product_id: line.productId,
      description: line.name,
      qty: line.qty,
      unit_price_cents: line.priceCents,
      amount_cents: line.priceCents * line.qty,
    })),
  };

  const orderPayload = {
    order_no: orderNo,
    channel: input.channel,
    table_label: input.table,
    status: "Completed",
    subtotal_cents: input.subtotalCents,
    discount_cents: input.discountCents,
    tax_cents: input.taxCents,
    total_cents: input.totalCents,
    promo_code: input.promoCode,
    items: input.lines.length,
  };

  const jePayload = {
    entry_no: jeNo,
    source_type: "sale",
    source_id: invoiceId,
    memo: "Sale " + input.invoiceNo,
    lines: [
      { account_code: paymentMethod === "Card" ? "1020" : "1000", debit_cents: input.totalCents, credit_cents: 0 },
      { account_code: "4000", debit_cents: 0, credit_cents: input.subtotalCents - input.discountCents },
      { account_code: "2100", debit_cents: 0, credit_cents: input.taxCents },
    ],
  };


  const sql = `
BEGIN IMMEDIATE;
INSERT INTO pos_orders (id, order_no, branch_id, shift_id, customer_id, channel, table_label, status, subtotal_cents, discount_cents, tax_cents, total_cents, promo_code, created_at) VALUES (
  ${[
    orderId,
    orderNo,
    BRANCH_ID,
    shift,
    input.customerId,
    input.channel,
    input.table,
    "Completed",
    input.subtotalCents,
    input.discountCents,
    input.taxCents,
    input.totalCents,
    input.promoCode,
    now,
  ]
    .map((value) => (value === null ? "NULL" : typeof value === "number" ? String(value) : sqlText(String(value))))
    .join(", ")}
);
${itemsSql}
INSERT INTO pos_sale_invoices (id, invoice_no, branch_id, order_id, customer_name, customer_ntn, paper_size, payment_terms, subtotal_cents, gst_cents, grand_total_cents, status, issued_at) VALUES (
  ${[
    invoiceId,
    input.invoiceNo,
    BRANCH_ID,
    orderId,
    input.customerName,
    input.customerNtn,
    "A4",
    "Paid",
    input.subtotalCents,
    input.taxCents,
    input.totalCents,
    "Paid",
    now,
  ]
    .map((value) => (value === null ? "NULL" : typeof value === "number" ? String(value) : sqlText(String(value))))
    .join(", ")}
);
${invoiceItemsSql}
${paymentRows
    .map(
      (row, index) =>
        "INSERT INTO pos_payments (id, order_id, invoice_id, method, amount_cents, tendered_cents, change_cents, paid_at, tip_cents) VALUES (" +
        [
          rowId("pay"),
          orderId,
          invoiceId,
          row.method,
          String(row.amountCents),
          String(index === 0 ? input.tenderedCents : row.amountCents),
          String(index === 0 ? input.changeCents : 0),
          now,
          String(index === 0 ? input.tipCents : 0),
        ]
          .map(sqlText)
          .join(", ") +
        ");",
    )
    .join("\n")}
INSERT INTO acc_journal_entries (id, entry_no, branch_id, source_type, source_id, memo, posted_at) VALUES (
  ${["JE_" + jeNo.slice(3), jeNo, BRANCH_ID, "sale", invoiceId, "Sale " + input.invoiceNo, now].map(sqlText).join(", ")}
);
INSERT INTO acc_journal_lines (id, entry_id, account_id, debit_cents, credit_cents) VALUES
${paymentRows
    .map(
      (row) =>
        "  (" +
        [rowId("jl"), "JE_" + jeNo.slice(3), accountFor(row.method), String(row.amountCents), "0"]
          .map(sqlText)
          .join(", ") +
        ")",
    )
    .join(",\n")},
  (${[rowId("jl"), "JE_" + jeNo.slice(3), "acct_4000", "0", String(netSales)].map(sqlText).join(", ")}),
  (${[rowId("jl"), "JE_" + jeNo.slice(3), "acct_2100", "0", String(input.taxCents)].map(sqlText).join(", ")});
${input.tipCents > 0 ? "INSERT INTO acc_journal_lines (id, entry_id, account_id, debit_cents, credit_cents) VALUES (" + [rowId("jl"), "JE_" + jeNo.slice(3), "acct_2200", "0", String(input.tipCents)].map(sqlText).join(", ") + ");" : ""}
${paymentRows
    .map(
      (row) =>
        "UPDATE acc_accounts SET balance_cents = balance_cents + " +
        row.amountCents +
        " WHERE id = '" +
        accountFor(row.method) +
        "';",
    )
    .join("\n")}
UPDATE acc_accounts SET balance_cents = balance_cents + ${netSales} WHERE id = 'acct_4000';
UPDATE acc_accounts SET balance_cents = balance_cents + ${input.taxCents} WHERE id = 'acct_2100';
${input.tipCents > 0 ? "UPDATE acc_accounts SET balance_cents = balance_cents + " + input.tipCents + " WHERE id = 'acct_2200';" : ""}
UPDATE sync_terminal_config SET value = ${sqlText(String(counters.inv))} WHERE key = 'next_inv_seq';
UPDATE sync_terminal_config SET value = ${sqlText(String(counters.order))} WHERE key = 'next_order_seq';
UPDATE sync_terminal_config SET value = ${sqlText(String(counters.je))} WHERE key = 'next_je_seq';
INSERT INTO sync_outbox (id, service_name, entity_type, entity_id, operation, payload_json, idempotency_key, branch_id, terminal_id, created_at) VALUES
  (${[
    ulid(),
    "sale",
    "sale_invoice",
    invoiceId,
    "INSERT",
    JSON.stringify(salePayload),
    TERMINAL_ID + ":sale_invoice:" + invoiceId,
    BRANCH_ID,
    TERMINAL_ID,
    now,
  ].map(sqlText).join(", ")}),
  (${[
    ulid(),
    "sale",
    "pos_order",
    orderId,
    "INSERT",
    JSON.stringify(orderPayload),
    TERMINAL_ID + ":pos_order:" + orderId,
    BRANCH_ID,
    TERMINAL_ID,
    now,
  ].map(sqlText).join(", ")}),
  (${[
    ulid(),
    "accounting",
    "journal_entry",
    "JE_" + jeNo.slice(3),
    "INSERT",
    JSON.stringify(jePayload),
    TERMINAL_ID + ":journal_entry:" + jeNo,
    BRANCH_ID,
    TERMINAL_ID,
    now,
  ].map(sqlText).join(", ")});
COMMIT;
`;

  await withWrite(async () => {
    await exec(sql);
    await refreshCounts();
    patchSync({ writeCount: syncState().writeCount + 1 });
  });
}

export interface InvoiceLineWrite {
  productId: string;
  description: string;
  qty: number;
  priceCents: number;
}

export interface InvoiceWrite {
  invoiceNo: string;
  customerName: string;
  customerNtn: string | null;
  paperSize: string;
  terms: string;
  status: string;
  lines: InvoiceLineWrite[];
  subtotalCents: number;
  discountCents: number;
  gstCents: number;
  totalCents: number;
  issuedAt: string;
}

/**
 * A manually entered invoice (catering, bill-to): the invoice and its lines
 * plus one outbox mutation. No payment or order row, since none was rung up.
 */
export async function writeInvoice(input: InvoiceWrite): Promise<void> {
  const invoiceId = ulid();
  const itemsSql = input.lines
    .map(
      (line) =>
        "INSERT INTO pos_sale_invoice_items (id, invoice_id, product_id, description, qty, unit_price_cents, amount_cents) VALUES (" +
        [
          rowId("ii"),
          invoiceId,
          line.productId,
          line.description,
          String(line.qty),
          String(line.priceCents),
          String(line.priceCents * line.qty),
        ]
          .map(sqlText)
          .join(", ") +
        ");",
    )
    .join("\n");

  const payload = {
    invoice_no: input.invoiceNo,
    customer_name: input.customerName,
    customer_ntn: input.customerNtn,
    paper_size: input.paperSize,
    payment_terms: input.terms,
    status: input.status,
    subtotal_cents: input.subtotalCents,
    discount_cents: input.discountCents,
    gst_cents: input.gstCents,
    grand_total_cents: input.totalCents,
    items: input.lines.map((line) => ({
      product_id: line.productId,
      description: line.description,
      qty: line.qty,
      unit_price_cents: line.priceCents,
      amount_cents: line.priceCents * line.qty,
    })),
  };

  const sql = `
BEGIN IMMEDIATE;
INSERT INTO pos_sale_invoices (id, invoice_no, branch_id, order_id, customer_name, customer_ntn, paper_size, payment_terms, subtotal_cents, gst_cents, grand_total_cents, status, issued_at) VALUES (
  ${[
    invoiceId,
    input.invoiceNo,
    BRANCH_ID,
    "NULL",
    input.customerName,
    input.customerNtn,
    input.paperSize,
    input.terms,
    input.subtotalCents,
    input.gstCents,
    input.totalCents,
    input.status,
    input.issuedAt,
  ]
    .map((value) =>
      value === null
        ? "NULL"
        : typeof value === "number"
          ? String(value)
          : value === "NULL"
            ? "NULL"
            : sqlText(String(value)),
    )
    .join(", ")}
);
${itemsSql}
INSERT INTO sync_outbox (id, service_name, entity_type, entity_id, operation, payload_json, idempotency_key, branch_id, terminal_id, created_at)
VALUES (${[
    ulid(),
    "sale",
    "sale_invoice",
    invoiceId,
    "INSERT",
    JSON.stringify(payload),
    TERMINAL_ID + ":sale_invoice:" + invoiceId,
    BRANCH_ID,
    TERMINAL_ID,
    input.issuedAt,
  ]
    .map(sqlText)
    .join(", ")});
COMMIT;
`;

  await withWrite(async () => {
    await exec(sql);
    await refreshCounts();
    patchSync({ writeCount: syncState().writeCount + 1 });
  });
}

export interface RefundWrite {
  invoiceNo: string;
  amountCents: number;
  method: string;
  reason: string;
}

/**
 * Posts a refund against a stored invoice: refund row, invoice status, a
 * reversing journal entry and an outbox mutation. Returns false when the
 * invoice only exists in the demo list (nothing to persist).
 */
export async function refundInvoice(
  input: RefundWrite,
): Promise<{ ok: boolean; full: boolean }> {
  const rows = await query<{
    id: string;
    grand_total_cents: number;
    gst_cents: number;
    status: string;
  }>(
    "SELECT id, grand_total_cents, gst_cents, status FROM pos_sale_invoices WHERE invoice_no = " +
      sqlText(input.invoiceNo) +
      ";",
  );
  const invoice = rows[0];
  if (!invoice) return { ok: false, full: false };

  const amount = Math.max(
    1,
    Math.min(Number(invoice.grand_total_cents), Math.round(input.amountCents)),
  );
  const taxShare = Math.round(
    amount * (Number(invoice.gst_cents) / Math.max(1, Number(invoice.grand_total_cents))),
  );
  const netShare = amount - taxShare;
  const full = amount >= Number(invoice.grand_total_cents);
  const status = full ? "Refunded" : "Partially refunded";
  const now = isoNow();
  const refundId = ulid();
  const jeNo =
    "JE-" + new Date(now).getFullYear() + "-" + String(counters.je + 1).padStart(4, "0");
  counters.je += 1;
  const jeId = "JE_" + jeNo.slice(3);
  const balanceAccount = input.method === "Card" ? "acct_1020" : "acct_1000";

  const payload = {
    refund_id: refundId,
    invoice_no: input.invoiceNo,
    amount_cents: amount,
    tax_cents: taxShare,
    method: input.method,
    reason: input.reason,
    full,
  };

  await withWrite(async () => {
    await exec(`
BEGIN IMMEDIATE;
INSERT INTO pos_refunds (id, invoice_id, amount_cents, tax_cents, reason, method, refunded_at, status) VALUES (
  ${[refundId, invoice.id, amount, taxShare, input.reason, input.method, now, "posted"]
    .map((value) => (typeof value === "number" ? String(value) : sqlText(String(value))))
    .join(", ")}
);
UPDATE pos_sale_invoices SET status = ${sqlText(status)} WHERE id = ${sqlText(invoice.id)};
INSERT INTO acc_journal_entries (id, entry_no, branch_id, source_type, source_id, memo, posted_at) VALUES (
  ${[jeId, jeNo, BRANCH_ID, "refund", invoice.id, "Refund " + input.invoiceNo, now]
    .map(sqlText)
    .join(", ")}
);
INSERT INTO acc_journal_lines (id, entry_id, account_id, debit_cents, credit_cents) VALUES
  (${[rowId("jl"), jeId, "acct_4000", String(netShare), "0"].map(sqlText).join(", ")}),
  (${[rowId("jl"), jeId, "acct_2100", String(taxShare), "0"].map(sqlText).join(", ")}),
  (${[rowId("jl"), jeId, balanceAccount, "0", String(amount)].map(sqlText).join(", ")});
UPDATE acc_accounts SET balance_cents = balance_cents - ${netShare} WHERE id = 'acct_4000';
UPDATE acc_accounts SET balance_cents = balance_cents - ${taxShare} WHERE id = 'acct_2100';
UPDATE acc_accounts SET balance_cents = balance_cents - ${amount} WHERE id = ${sqlText(balanceAccount)};
UPDATE sync_terminal_config SET value = ${sqlText(String(counters.je))} WHERE key = 'next_je_seq';
INSERT INTO sync_outbox (id, service_name, entity_type, entity_id, operation, payload_json, idempotency_key, branch_id, terminal_id, created_at)
VALUES (${[
      ulid(),
      "sale",
      "refund",
      refundId,
      "INSERT",
      JSON.stringify(payload),
      TERMINAL_ID + ":refund:" + refundId,
      BRANCH_ID,
      TERMINAL_ID,
      now,
    ]
      .map(sqlText)
      .join(", ")});
COMMIT;
`);
    await refreshCounts();
    patchSync({ writeCount: syncState().writeCount + 1 });
  });

  return { ok: true, full };
}

/** Voids a stored invoice; a paid sale should be refunded instead. */
export async function voidInvoice(invoiceNo: string): Promise<boolean> {
  const rows = await query<{ id: string; order_id: string | null }>(
    "SELECT id, order_id FROM pos_sale_invoices WHERE invoice_no = " +
      sqlText(invoiceNo) +
      ";",
  );
  const invoice = rows[0];
  if (!invoice) return false;
  const now = isoNow();

  await withWrite(async () => {
    await exec(`
BEGIN IMMEDIATE;
UPDATE pos_sale_invoices SET status = 'Voided' WHERE id = ${sqlText(invoice.id)};
${invoice.order_id ? "UPDATE pos_orders SET status = 'Voided' WHERE id = " + sqlText(invoice.order_id) + ";" : ""}
INSERT INTO sync_outbox (id, service_name, entity_type, entity_id, operation, payload_json, idempotency_key, branch_id, terminal_id, created_at)
VALUES (${[
      ulid(),
      "sale",
      "sale_invoice",
      invoice.id,
      "UPDATE",
      JSON.stringify({ invoice_no: invoiceNo, status: "Voided" }),
      TERMINAL_ID + ":sale_invoice:" + invoice.id + ":void",
      BRANCH_ID,
      TERMINAL_ID,
      now,
    ]
      .map(sqlText)
      .join(", ")});
COMMIT;
`);
    await refreshCounts();
    patchSync({ writeCount: syncState().writeCount + 1 });
  });
  return true;
}

export async function markOrder(input: {
  id: string;
  orderNo: string;
  status: string;
  channel: string;
  table: string;
  totalCents: number;
}): Promise<void> {
  const now = isoNow();
  const payload = {
    order_no: input.orderNo,
    status: input.status,
    channel: input.channel,
    table_label: input.table,
    total_cents: input.totalCents,
  };
  await withWrite(async () => {
    await exec(`
BEGIN IMMEDIATE;
INSERT INTO pos_orders (id, order_no, branch_id, shift_id, customer_id, channel, table_label, status, subtotal_cents, discount_cents, tax_cents, total_cents, created_at)
VALUES (${[
      sqlText(input.id),
      sqlText(input.orderNo),
      sqlText(BRANCH_ID),
      "NULL",
      "NULL",
      sqlText(input.channel),
      sqlText(input.table),
      sqlText(input.status),
      String(input.totalCents),
      "0",
      "0",
      String(input.totalCents),
      sqlText(now),
    ].join(", ")})
ON CONFLICT(id) DO UPDATE SET status = excluded.status;
INSERT INTO sync_outbox (id, service_name, entity_type, entity_id, operation, payload_json, idempotency_key, branch_id, terminal_id, created_at)
VALUES (${[
      sqlText(ulid()),
      sqlText("sale"),
      sqlText("pos_order"),
      sqlText(input.id),
      sqlText("UPDATE"),
      sqlText(JSON.stringify(payload)),
      sqlText(TERMINAL_ID + ":pos_order:" + input.id + ":" + input.status),
      sqlText(BRANCH_ID),
      sqlText(TERMINAL_ID),
      sqlText(now),
    ].join(", ")});
COMMIT;
`);
    await refreshCounts();
  });
}

export async function closeShift(countedCents: number): Promise<void> {
  const shift = await getConfig("current_shift_id");
  if (!shift) return;
  const now = isoNow();
  await withWrite(async () => {
    await exec(`
BEGIN IMMEDIATE;
UPDATE pos_shifts SET status = 'closed', counted_cash_cents = ${Math.round(countedCents)}, closed_at = ${sqlText(now)} WHERE id = ${sqlText(shift)};
INSERT INTO sync_outbox (id, service_name, entity_type, entity_id, operation, payload_json, idempotency_key, branch_id, terminal_id, created_at)
VALUES (${[
      sqlText(ulid()),
      sqlText("sale"),
      sqlText("shift"),
      sqlText(shift),
      sqlText("UPDATE"),
      sqlText(JSON.stringify({ shift_id: shift, counted_cash_cents: Math.round(countedCents), closed_at: now })),
      sqlText(TERMINAL_ID + ":shift:" + shift + ":closed"),
      sqlText(BRANCH_ID),
      sqlText(TERMINAL_ID),
      sqlText(now),
    ].join(", ")});
COMMIT;
`);
    await refreshCounts();
  });
}

/* ——— Reads for the UI ——— */

export async function recentSaleRows(limit = 20): Promise<SaleRow[]> {
  return query<SaleRow>(`
SELECT i.invoice_no, i.issued_at, i.customer_name, i.status, i.grand_total_cents, i.gst_cents, i.subtotal_cents,
       o.channel, o.table_label, p.method AS payment_method,
       (SELECT COUNT(*) FROM pos_sale_invoice_items ii WHERE ii.invoice_id = i.id) AS items
FROM pos_sale_invoices i
LEFT JOIN pos_orders o ON o.id = i.order_id
LEFT JOIN pos_payments p ON p.invoice_id = i.id
ORDER BY i.issued_at DESC
LIMIT ${Math.max(1, Math.min(200, limit))};
`);
}

/** Reserves the next adjustment number, e.g. ADJ-2026-0062. */
export function nextAdjustmentNo(): string {
  counters.adj += 1;
  void persistCounter("next_adj_seq", counters.adj);
  return "ADJ-" + new Date().getFullYear() + "-" + String(counters.adj).padStart(4, "0");
}

export function nextGrnNo(): string {
  counters.grn += 1;
  void persistCounter("next_grn_seq", counters.grn);
  return "GRN-" + new Date().getFullYear() + "-" + String(counters.grn).padStart(4, "0");
}

/** Reserves the next journal entry number, e.g. JE-2026-0419. */
export function nextJournalNo(): string {
  counters.je += 1;
  void persistCounter("next_je_seq", counters.je);
  return "JE-" + new Date().getFullYear() + "-" + String(counters.je).padStart(4, "0");
}

/** Receives goods: balances, ledger, GRN rows and an inventory mutation. */
export async function receiveGoods(input: {
  grnNo: string;
  supplierId: string;
  invoiceNo: string;
  receivedAt: string;
  poNo?: string;
  entryNo?: string;
  lines: { sku: string; qty: number; costCents: number }[];
}): Promise<void> {
  const statements: string[] = [];
  const grnItemStatements: string[] = [];
  const payloadLines: { sku: string; qty: number; cost_cents: number }[] = [];
  const grnId = ulid();
  let subtotal = 0;

  for (const line of input.lines) {
    const rows = await query<{ id: string }>(
      "SELECT id FROM inv_items WHERE sku = " + sqlText(line.sku) + ";",
    );
    const item = rows[0];
    if (!item) continue;
    const total = Math.round(line.qty * line.costCents);
    subtotal += total;
    payloadLines.push({ sku: line.sku, qty: line.qty, cost_cents: line.costCents });
    statements.push(
      "UPDATE inv_items SET cost_cents = " + Math.round(line.costCents) + ", updated_at = " + sqlText(input.receivedAt) + " WHERE id = " + sqlText(item.id) + ";",
    );
    statements.push(
      "INSERT INTO inv_stock_balances (branch_id, item_id, qty_on_hand, updated_at) VALUES (" +
        [BRANCH_ID, item.id, String(line.qty), input.receivedAt].map(sqlText).join(", ") +
        ") ON CONFLICT(branch_id, item_id) DO UPDATE SET qty_on_hand = qty_on_hand + " + line.qty + ", updated_at = excluded.updated_at;",
    );
    statements.push(
      "INSERT INTO inv_stock_ledger (id, branch_id, item_id, delta_qty, ref_type, ref_id, created_at) VALUES (" +
        [ulid(), BRANCH_ID, item.id, String(line.qty), "grn", input.grnNo, input.receivedAt].map(sqlText).join(", ") +
        ");",
    );
    grnItemStatements.push(
      "INSERT INTO inv_grn_items (id, grn_id, item_id, qty_received, unit_cost_cents, line_total_cents) VALUES (" +
        [ulid(), grnId, item.id, String(line.qty), String(line.costCents), String(total)].map(sqlText).join(", ") +
        ");",
    );
  }
  if (statements.length === 0) return;

  const tax = Math.round(subtotal * 0.08);
  const total = subtotal + tax;
  const billId = ulid();
  const billNo =
    input.invoiceNo.trim() !== "" && input.invoiceNo !== "Pending invoice"
      ? input.invoiceNo
      : input.grnNo;
  const dueDate = new Date(
    new Date(input.receivedAt).getTime() + 7 * 86_400_000,
  ).toISOString();
  let entryNo = input.entryNo;
  if (!entryNo) {
    counters.je += 1;
    entryNo =
      "JE-" +
      new Date(input.receivedAt).getFullYear() +
      "-" +
      String(counters.je).padStart(4, "0");
  }
  const entryId = "JE_" + entryNo.slice(3);
  const memo = "Goods received · " + input.grnNo;
  const journalLines: string[][] = [
    [rowId("jl"), entryId, "acct_1200", String(subtotal), "0"],
    [rowId("jl"), entryId, "acct_2000", "0", String(total)],
  ];
  if (tax > 0) {
    journalLines.splice(1, 0, [rowId("jl"), entryId, "acct_2100", String(tax), "0"]);
  }
  const billPayload = {
    bill_id: billId,
    bill_no: billNo,
    grn_id: grnId,
    grn_no: input.grnNo,
    supplier_id: input.supplierId,
    due_date: dueDate,
    total_cents: total,
    status: "Open",
  };
  const journalPayload = {
    entry_no: entryNo,
    source_type: "grn",
    source_id: grnId,
    memo,
    posted_at: input.receivedAt,
    lines: [
      { account_code: "1200", debit_cents: subtotal, credit_cents: 0 },
      ...(tax > 0
        ? [{ account_code: "2100", debit_cents: tax, credit_cents: 0 }]
        : []),
      { account_code: "2000", debit_cents: 0, credit_cents: total },
    ],
  };
  const poUpdate = input.poNo
    ? "\nUPDATE inv_purchase_orders SET status = 'Received', grn_no = " + sqlText(input.grnNo) + " WHERE po_no = " + sqlText(input.poNo) + ";"
    : "";
  await withWrite(async () => {
    await exec(`
BEGIN IMMEDIATE;
INSERT INTO inv_grns (id, grn_no, branch_id, supplier_id, supplier_invoice_no, received_date, subtotal_cents, tax_cents, total_cents, payment_status, created_at, po_no) VALUES (${[
      grnId, input.grnNo, BRANCH_ID, input.supplierId, input.invoiceNo, input.receivedAt,
      String(subtotal), String(tax), String(total), "Unpaid", input.receivedAt, input.poNo ?? "",
    ].map(sqlText).join(", ")});
${grnItemStatements.join("\n")}
${statements.join("\n")}
INSERT INTO acc_vendor_bills (id, bill_no, grn_id, supplier_id, due_date, total_cents, paid_cents, status, created_at) VALUES (${[
      billId, billNo, grnId, input.supplierId, dueDate, String(total), "0", "Open", input.receivedAt,
    ].map(sqlText).join(", ")});
INSERT INTO acc_journal_entries (id, entry_no, branch_id, source_type, source_id, memo, posted_at) VALUES (${[
      entryId, entryNo, BRANCH_ID, "grn", grnId, memo, input.receivedAt,
    ].map(sqlText).join(", ")});
INSERT INTO acc_journal_lines (id, entry_id, account_id, debit_cents, credit_cents) VALUES
${journalLines.map((line) => "  (" + line.map(sqlText).join(", ") + ")").join(",\n")};
UPDATE acc_accounts SET balance_cents = balance_cents + ${subtotal} WHERE id = 'acct_1200';
${tax > 0 ? "UPDATE acc_accounts SET balance_cents = balance_cents - " + tax + " WHERE id = 'acct_2100';" : ""}
UPDATE acc_accounts SET balance_cents = balance_cents + ${total} WHERE id = 'acct_2000';
UPDATE sync_terminal_config SET value = ${sqlText(String(counters.grn))} WHERE key = 'next_grn_seq';
UPDATE sync_terminal_config SET value = ${sqlText(String(counters.je))} WHERE key = 'next_je_seq';
INSERT INTO sync_outbox (id, service_name, entity_type, entity_id, operation, payload_json, idempotency_key, branch_id, terminal_id, created_at) VALUES
  (${[
      ulid(), "inventory", "grn", grnId, "INSERT",
      JSON.stringify({ grn_no: input.grnNo, po_no: input.poNo ?? null, supplier_id: input.supplierId, invoice_no: input.invoiceNo, lines: payloadLines }),
      TERMINAL_ID + ":grn:" + grnId, BRANCH_ID, TERMINAL_ID, input.receivedAt,
    ].map(sqlText).join(", ")}),
  (${[
      ulid(), "accounting", "vendor_bill", billId, "INSERT",
      JSON.stringify(billPayload),
      TERMINAL_ID + ":vendor_bill:" + billId, BRANCH_ID, TERMINAL_ID, input.receivedAt,
    ].map(sqlText).join(", ")}),
  (${[
      ulid(), "accounting", "journal_entry", entryId, "INSERT",
      JSON.stringify(journalPayload),
      TERMINAL_ID + ":journal_entry:" + entryNo, BRANCH_ID, TERMINAL_ID, input.receivedAt,
    ].map(sqlText).join(", ")});${poUpdate}
COMMIT;
`);
    await refreshCounts();
    patchSync({ writeCount: syncState().writeCount + 1 });
  });
}

export interface PurchaseOrderLine {
  sku: string;
  name: string;
  qty: number;
  costCents: number;
}

export function poTotalCents(lines: PurchaseOrderLine[]): number {
  return lines.reduce((sum, line) => sum + Math.round(line.qty * line.costCents), 0);
}

/**
 * Receives a purchase order end to end: the PO is written if it only existed as
 * fixture data, then `receiveGoods` posts the GRN, stock and ledger, and stamps
 * the PO as Received with the GRN number in the same transaction.
 */
export async function receivePurchaseOrder(input: {
  grnNo: string;
  poNo: string;
  supplier: string;
  lines: PurchaseOrderLine[];
  invoiceNo?: string;
  entryNo?: string;
  receivedAt?: string;
}): Promise<void> {
  if (input.lines.length === 0) return;
  const receivedAt = input.receivedAt ?? isoNow();
  const total = poTotalCents(input.lines);
  const supplierRows = await query<{ id: string }>(
    "SELECT id FROM inv_suppliers WHERE name = " + sqlText(input.supplier) + ";",
  );
  const supplierId = supplierRows[0]?.id ?? "sup-2";

  await withWrite(() =>
    exec(
      "INSERT OR IGNORE INTO inv_purchase_orders (id, po_no, supplier, expected, lines_count, total_cents, status, created_at, lines_json, grn_no) VALUES (" +
        [
          sqlText(ulid()),
          sqlText(input.poNo),
          sqlText(input.supplier),
          sqlText("Today"),
          String(input.lines.length),
          String(total),
          "'Sent'",
          sqlText(receivedAt),
          sqlJson(input.lines),
          "NULL",
        ].join(", ") +
        ");\n" +
        "UPDATE inv_purchase_orders SET lines_json = " +
        sqlJson(input.lines) +
        ", lines_count = " +
        input.lines.length +
        ", total_cents = " +
        total +
        " WHERE po_no = " +
        sqlText(input.poNo) +
        ";",
    ),
  );

  await receiveGoods({
    grnNo: input.grnNo,
    supplierId,
    invoiceNo: input.invoiceNo ?? "Pending invoice",
    receivedAt,
    poNo: input.poNo,
    entryNo: input.entryNo,
    lines: input.lines.map((line) => ({
      sku: line.sku,
      qty: line.qty,
      costCents: line.costCents,
    })),
  });
}

export interface PurchaseOrderRow {
  po_no: string;
  supplier: string;
  expected: string;
  lines_count: number;
  total_cents: number;
  status: string;
  created_at: string;
  lines_json: string | null;
  grn_no: string | null;
}

export async function loadPurchaseOrders(): Promise<PurchaseOrderRow[]> {
  return query<PurchaseOrderRow>(
    "SELECT po_no, supplier, expected, lines_count, total_cents, status, created_at, lines_json, grn_no FROM inv_purchase_orders ORDER BY created_at DESC, rowid DESC LIMIT 50;",
  );
}

export async function savePurchaseOrderDraft(input: {
  number: string;
  supplier: string;
  expected: string;
  lines: PurchaseOrderLine[];
  totalCents: number;
  createdAt: string;
}): Promise<void> {
  await withWrite(() =>
    exec(
      "INSERT OR IGNORE INTO inv_purchase_orders (id, po_no, supplier, expected, lines_count, total_cents, status, created_at, lines_json) VALUES (" +
        [
          sqlText(ulid()),
          sqlText(input.number),
          sqlText(input.supplier),
          sqlText(input.expected),
          String(input.lines.length),
          String(input.totalCents),
          "'Draft'",
          sqlText(input.createdAt),
          sqlJson(input.lines),
        ].join(", ") +
        ");",
    ),
  );
  patchSync({ writeCount: syncState().writeCount + 1 });
}

export interface GrnRow {
  number: string;
  supplier: string;
  po_no: string | null;
  received_date: string;
  lines: number;
  total_cents: number;
  invoice_no: string;
  payment_status: string;
}

/** Receipts posted on this terminal, newest first. */
export async function loadGrns(limit = 50): Promise<GrnRow[]> {
  return query<GrnRow>(`
SELECT g.grn_no AS number,
       COALESCE(s.name, 'Unknown supplier') AS supplier,
       g.po_no,
       g.received_date,
       (SELECT COUNT(*) FROM inv_grn_items gi WHERE gi.grn_id = g.id) AS lines,
       g.total_cents,
       g.supplier_invoice_no AS invoice_no,
       g.payment_status
FROM inv_grns g
LEFT JOIN inv_suppliers s ON s.id = g.supplier_id
ORDER BY g.received_date DESC, g.rowid DESC
LIMIT ${Math.max(1, Math.min(100, limit))};
`);
}

export interface VendorBillRow {
  id: string;
  bill_no: string;
  supplier: string;
  grn_no: string | null;
  due_date: string;
  total_cents: number;
  paid_cents: number;
  status: string;
  payment_entry: string | null;
}

/** Supplier bills created by goods receipts, newest first. */
export async function loadVendorBills(limit = 50): Promise<VendorBillRow[]> {
  return query<VendorBillRow>(`
SELECT b.id,
       b.bill_no,
       COALESCE(s.name, 'Unknown supplier') AS supplier,
       g.grn_no,
       b.due_date,
       b.total_cents,
       b.paid_cents,
       b.status,
       (SELECT p.entry_no FROM acc_bill_payments p
        WHERE p.bill_id = b.id ORDER BY p.rowid DESC LIMIT 1) AS payment_entry
FROM acc_vendor_bills b
LEFT JOIN inv_suppliers s ON s.id = b.supplier_id
LEFT JOIN inv_grns g ON g.id = b.grn_id
ORDER BY b.created_at DESC, b.rowid DESC
LIMIT ${Math.max(1, Math.min(100, limit))};
`);
}

export interface BillPaymentRequest {
  billId?: string;
  billNo: string;
  entryNo: string;
}

export interface BillPaymentResult {
  count: number;
  totalCents: number;
}

/**
 * Pays a batch of open bills in one transaction: a payment row, an AP → bank
 * journal entry and the accounting mutations for each bill, with the balance
 * moves and sequence update committed together. Settled bills are skipped.
 */
export async function payVendorBills(input: {
  bills: BillPaymentRequest[];
  method?: string;
  paidAt?: string;
}): Promise<BillPaymentResult> {
  const method = input.method ?? "Bank";
  const account = method === "Cash" ? "acct_1000" : "acct_1010";
  const paidAt = input.paidAt ?? isoNow();

  const resolved: {
    id: string;
    bill_no: string;
    supplier: string;
    total_cents: number;
    amount: number;
    entryNo: string;
  }[] = [];

  for (const request of input.bills) {
    const match = request.billId
      ? "(b.id = " + sqlText(request.billId) + " OR b.bill_no = " + sqlText(request.billNo) + ")"
      : "b.bill_no = " + sqlText(request.billNo);
    const rows = await query<{
      id: string;
      bill_no: string;
      total_cents: number;
      paid_cents: number;
      supplier: string;
    }>(`
SELECT b.id, b.bill_no, b.total_cents, b.paid_cents,
       COALESCE(s.name, 'Supplier') AS supplier
FROM acc_vendor_bills b
LEFT JOIN inv_suppliers s ON s.id = b.supplier_id
WHERE ${match}
ORDER BY b.rowid DESC
LIMIT 1;
`);
    const bill = rows[0];
    if (!bill) continue;
    const amount = Number(bill.total_cents) - Number(bill.paid_cents);
    if (amount <= 0) continue;
    resolved.push({
      id: bill.id,
      bill_no: bill.bill_no,
      supplier: bill.supplier,
      total_cents: Number(bill.total_cents),
      amount,
      entryNo: request.entryNo,
    });
  }

  if (resolved.length === 0) return { count: 0, totalCents: 0 };

  const totalCents = resolved.reduce((sum, bill) => sum + bill.amount, 0);
  const statements: string[] = [];
  const outbox: string[] = [];

  for (const bill of resolved) {
    const paymentId = ulid();
    const entryId = "JE_" + bill.entryNo.slice(3);
    const memo = "Paid " + bill.bill_no + " · " + bill.supplier;
    const paymentPayload = {
      payment_id: paymentId,
      bill_id: bill.id,
      bill_no: bill.bill_no,
      entry_no: bill.entryNo,
      amount_cents: bill.amount,
      method,
      paid_at: paidAt,
    };
    const journalPayload = {
      entry_no: bill.entryNo,
      source_type: "bill_payment",
      source_id: bill.id,
      memo,
      posted_at: paidAt,
      lines: [
        { account_code: "2000", debit_cents: bill.amount, credit_cents: 0 },
        {
          account_code: method === "Cash" ? "1000" : "1010",
          debit_cents: 0,
          credit_cents: bill.amount,
        },
      ],
    };

    statements.push(
      "INSERT INTO acc_bill_payments (id, bill_id, entry_no, amount_cents, method, paid_at) VALUES (" +
        [paymentId, bill.id, bill.entryNo, String(bill.amount), method, paidAt]
          .map(sqlText)
          .join(", ") +
        ");",
      "UPDATE acc_vendor_bills SET paid_cents = paid_cents + " +
        bill.amount +
        ", status = 'Paid' WHERE id = " +
        sqlText(bill.id) +
        ";",
      "INSERT INTO acc_journal_entries (id, entry_no, branch_id, source_type, source_id, memo, posted_at) VALUES (" +
        [entryId, bill.entryNo, BRANCH_ID, "bill_payment", bill.id, memo, paidAt]
          .map(sqlText)
          .join(", ") +
        ");",
      "INSERT INTO acc_journal_lines (id, entry_id, account_id, debit_cents, credit_cents) VALUES\n  (" +
        [rowId("jl"), entryId, "acct_2000", String(bill.amount), "0"].map(sqlText).join(", ") +
        "),\n  (" +
        [rowId("jl"), entryId, account, "0", String(bill.amount)].map(sqlText).join(", ") +
        ");",
    );

    outbox.push(
      "(" +
        [
          ulid(), "accounting", "vendor_bill", bill.id, "UPDATE",
          JSON.stringify({ bill_no: bill.bill_no, status: "Paid", paid_cents: bill.total_cents }),
          TERMINAL_ID + ":vendor_bill:" + bill.id + ":paid", BRANCH_ID, TERMINAL_ID, paidAt,
        ].map(sqlText).join(", ") +
        ")",
      "(" +
        [
          ulid(), "accounting", "journal_entry", entryId, "INSERT",
          JSON.stringify(journalPayload),
          TERMINAL_ID + ":journal_entry:" + bill.entryNo, BRANCH_ID, TERMINAL_ID, paidAt,
        ].map(sqlText).join(", ") +
        ")",
      "(" +
        [
          ulid(), "accounting", "bill_payment", paymentId, "INSERT",
          JSON.stringify(paymentPayload),
          TERMINAL_ID + ":bill_payment:" + paymentId, BRANCH_ID, TERMINAL_ID, paidAt,
        ].map(sqlText).join(", ") +
        ")",
    );
  }

  await withWrite(async () => {
    await exec(`
BEGIN IMMEDIATE;
${statements.join("\n")}
UPDATE acc_accounts SET balance_cents = balance_cents - ${totalCents} WHERE id = 'acct_2000';
UPDATE acc_accounts SET balance_cents = balance_cents - ${totalCents} WHERE id = ${sqlText(account)};
UPDATE sync_terminal_config SET value = ${sqlText(String(counters.je))} WHERE key = 'next_je_seq';
INSERT INTO sync_outbox (id, service_name, entity_type, entity_id, operation, payload_json, idempotency_key, branch_id, terminal_id, created_at) VALUES
${outbox.join(",\n")};
COMMIT;
`);
    await refreshCounts();
    patchSync({ writeCount: syncState().writeCount + 1 });
  });

  return { count: resolved.length, totalCents };
}

/** Pays one bill through the batch path. */
export async function payVendorBill(input: {
  billId?: string;
  billNo: string;
  entryNo: string;
  method?: string;
  paidAt?: string;
}): Promise<boolean> {
  const result = await payVendorBills({
    bills: [{ billId: input.billId, billNo: input.billNo, entryNo: input.entryNo }],
    method: input.method,
    paidAt: input.paidAt,
  });
  return result.count > 0;
}

/** One side of a manual journal entry: an account with a debit or a credit. */
export interface JournalLineInput {
  accountCode: string;
  debitCents: number;
  creditCents: number;
}

/** Clamps the cents on a line and drops entries with no value. */
function cleanJournalLines(lines: JournalLineInput[]): JournalLineInput[] {
  return lines
    .map((line) => ({
      accountCode: line.accountCode,
      debitCents: Math.max(0, Math.round(line.debitCents)),
      creditCents: Math.max(0, Math.round(line.creditCents)),
    }))
    .filter((line) => line.debitCents > 0 || line.creditCents > 0);
}

/** The `(id, …)` tuples that store each line. */
function journalLineValues(entryId: string, lines: JournalLineInput[]): string {
  return lines
    .map((line) =>
      [
        rowId("jl"),
        entryId,
        "acct_" + line.accountCode,
        String(line.debitCents),
        String(line.creditCents),
      ]
        .map(sqlText)
        .join(", "),
    )
    .map((values) => "(" + values + ")")
    .join(",\n  ");
}

/**
 * SQL that moves one line through the balances. A debit grows assets and
 * expenses and shrinks liabilities, equity and revenue; a credit does the
 * reverse. Two statements per side keep the account-type guard in SQL.
 */
function journalBalanceSql(line: JournalLineInput): string {
  const id = sqlText("acct_" + line.accountCode);
  const statements: string[] = [];
  if (line.debitCents > 0) {
    statements.push(
      `UPDATE acc_accounts SET balance_cents = balance_cents + ${line.debitCents} WHERE id = ${id} AND type IN ('Asset','Expense');`,
      `UPDATE acc_accounts SET balance_cents = balance_cents - ${line.debitCents} WHERE id = ${id} AND type IN ('Liability','Equity','Revenue');`,
    );
  }
  if (line.creditCents > 0) {
    statements.push(
      `UPDATE acc_accounts SET balance_cents = balance_cents + ${line.creditCents} WHERE id = ${id} AND type IN ('Liability','Equity','Revenue');`,
      `UPDATE acc_accounts SET balance_cents = balance_cents - ${line.creditCents} WHERE id = ${id} AND type IN ('Asset','Expense');`,
    );
  }
  return statements.join("\n");
}

/** The outbox payload shared by posted and draft manual entries. */
function journalPayload(input: {
  entryNo: string;
  memo: string;
  postedAt: string;
  lines: JournalLineInput[];
  status?: string;
}): Record<string, unknown> {
  return {
    entry_no: input.entryNo,
    source_type: "manual",
    ...(input.status ? { status: input.status } : {}),
    memo: input.memo,
    posted_at: input.postedAt,
    lines: input.lines.map((line) => ({
      account_code: line.accountCode,
      debit_cents: line.debitCents,
      credit_cents: line.creditCents,
    })),
  };
}

/**
 * Posts a manual journal entry with any number of lines. Balances move by
 * account type, so a debit grows assets and expenses while a credit grows
 * liabilities, equity and revenue.
 */
export async function postJournalEntry(input: {
  entryNo: string;
  memo: string;
  lines: JournalLineInput[];
  postedAt?: string;
}): Promise<void> {
  const lines = cleanJournalLines(input.lines);
  const postedAt = input.postedAt ?? isoNow();
  const entryId = "JE_" + input.entryNo.slice(3);
  const payload = journalPayload({
    entryNo: input.entryNo,
    memo: input.memo,
    postedAt,
    lines,
  });
  const balanceStatements = lines.map(journalBalanceSql).filter((sql) => sql !== "").join("\n");

  await withWrite(async () => {
    await exec(`
BEGIN IMMEDIATE;
INSERT INTO acc_journal_entries (id, entry_no, branch_id, source_type, source_id, memo, posted_at) VALUES (${[
      sqlText(entryId),
      sqlText(input.entryNo),
      sqlText(BRANCH_ID),
      sqlText("manual"),
      "NULL",
      sqlText(input.memo),
      sqlText(postedAt),
    ].join(", ")});
INSERT INTO acc_journal_lines (id, entry_id, account_id, debit_cents, credit_cents) VALUES
  ${journalLineValues(entryId, lines)};
${balanceStatements}
UPDATE sync_terminal_config SET value = ${sqlText(String(counters.je))} WHERE key = 'next_je_seq';
INSERT INTO sync_outbox (id, service_name, entity_type, entity_id, operation, payload_json, idempotency_key, branch_id, terminal_id, created_at)
VALUES (${[
      ulid(),
      "accounting",
      "journal_entry",
      entryId,
      "INSERT",
      JSON.stringify(payload),
      TERMINAL_ID + ":journal_entry:" + input.entryNo,
      BRANCH_ID,
      TERMINAL_ID,
      postedAt,
    ].map(sqlText).join(", ")});
COMMIT;
`);
    await refreshCounts();
    patchSync({ writeCount: syncState().writeCount + 1 });
  });
}

/**
 * Saves a manual entry as a draft: the header and lines are stored, balances
 * stay untouched and the outbox gets the draft's INSERT.
 */
export async function saveJournalDraft(input: {
  entryNo: string;
  memo: string;
  lines: JournalLineInput[];
  postedAt?: string;
}): Promise<void> {
  const lines = cleanJournalLines(input.lines);
  const postedAt = input.postedAt ?? isoNow();
  const entryId = "JE_" + input.entryNo.slice(3);
  const payload = journalPayload({
    entryNo: input.entryNo,
    memo: input.memo,
    postedAt,
    lines,
    status: "Draft",
  });

  await withWrite(async () => {
    await exec(`
BEGIN IMMEDIATE;
INSERT INTO acc_journal_entries (id, entry_no, branch_id, source_type, source_id, memo, posted_at, status) VALUES (${[
      sqlText(entryId),
      sqlText(input.entryNo),
      sqlText(BRANCH_ID),
      sqlText("manual"),
      "NULL",
      sqlText(input.memo),
      sqlText(postedAt),
      sqlText("Draft"),
    ].join(", ")});
INSERT INTO acc_journal_lines (id, entry_id, account_id, debit_cents, credit_cents) VALUES
  ${journalLineValues(entryId, lines)};
UPDATE sync_terminal_config SET value = ${sqlText(String(counters.je))} WHERE key = 'next_je_seq';
INSERT INTO sync_outbox (id, service_name, entity_type, entity_id, operation, payload_json, idempotency_key, branch_id, terminal_id, created_at)
VALUES (${[
      ulid(),
      "accounting",
      "journal_entry",
      entryId,
      "INSERT",
      JSON.stringify(payload),
      TERMINAL_ID + ":journal_entry:" + input.entryNo,
      BRANCH_ID,
      TERMINAL_ID,
      postedAt,
    ].map(sqlText).join(", ")});
COMMIT;
`);
    await refreshCounts();
    patchSync({ writeCount: syncState().writeCount + 1 });
  });
}

/**
 * Posts a saved draft: flips its status, moves each line's balance by account
 * type and queues the update. Returns false when the entry is not a draft.
 */
export async function postDraftJournalEntry(entryNo: string): Promise<boolean> {
  const rows = await query<{ id: string; status: string; memo: string }>(
    "SELECT id, status, memo FROM acc_journal_entries WHERE entry_no = " +
      sqlText(entryNo) +
      ";",
  );
  const entry = rows[0];
  if (!entry || entry.status === "Posted") return false;

  const lines = await query<{
    account_id: string;
    debit_cents: number;
    credit_cents: number;
    type: string;
    code: string;
  }>(`
SELECT l.account_id, l.debit_cents, l.credit_cents, a.type, a.code
FROM acc_journal_lines l
JOIN acc_accounts a ON a.id = l.account_id
WHERE l.entry_id = ${sqlText(entry.id)};
`);

  const balanceStatements = lines
    .map((line) =>
      journalBalanceSql({
        accountCode: line.code,
        debitCents: Number(line.debit_cents),
        creditCents: Number(line.credit_cents),
      }),
    )
    .filter((sql) => sql !== "")
    .join("\n");

  const payload = {
    entry_no: entryNo,
    status: "Posted",
    memo: entry.memo,
    lines: lines.map((line) => ({
      account_code: line.code,
      debit_cents: Number(line.debit_cents),
      credit_cents: Number(line.credit_cents),
    })),
  };

  await withWrite(async () => {
    await exec(`
BEGIN IMMEDIATE;
UPDATE acc_journal_entries SET status = 'Posted' WHERE id = ${sqlText(entry.id)};
${balanceStatements}
INSERT INTO sync_outbox (id, service_name, entity_type, entity_id, operation, payload_json, idempotency_key, branch_id, terminal_id, created_at)
VALUES (${[
      ulid(),
      "accounting",
      "journal_entry",
      entry.id,
      "UPDATE",
      JSON.stringify(payload),
      TERMINAL_ID + ":journal_entry:" + entryNo + ":posted",
      BRANCH_ID,
      TERMINAL_ID,
      isoNow(),
    ].map(sqlText).join(", ")});
COMMIT;
`);
    await refreshCounts();
    patchSync({ writeCount: syncState().writeCount + 1 });
  });
  return true;
}

/**
 * Deletes a saved draft and its lines. Posted entries are never removed, so
 * this returns false for anything that is not a draft.
 */
export async function discardJournalDraft(entryNo: string): Promise<boolean> {
  const rows = await query<{ id: string; status: string }>(
    "SELECT id, status FROM acc_journal_entries WHERE entry_no = " +
      sqlText(entryNo) +
      ";",
  );
  const entry = rows[0];
  if (!entry || entry.status !== "Draft") return false;

  await withWrite(async () => {
    await exec(`
BEGIN IMMEDIATE;
DELETE FROM acc_journal_lines WHERE entry_id = ${sqlText(entry.id)};
DELETE FROM acc_journal_entries WHERE id = ${sqlText(entry.id)};
INSERT INTO sync_outbox (id, service_name, entity_type, entity_id, operation, payload_json, idempotency_key, branch_id, terminal_id, created_at)
VALUES (${[
      ulid(),
      "accounting",
      "journal_entry",
      entry.id,
      "DELETE",
      JSON.stringify({ entry_no: entryNo, deleted: true }),
      TERMINAL_ID + ":journal_entry:" + entryNo + ":discard",
      BRANCH_ID,
      TERMINAL_ID,
      isoNow(),
    ].map(sqlText).join(", ")});
COMMIT;
`);
    await refreshCounts();
    patchSync({ writeCount: syncState().writeCount + 1 });
  });
  return true;
}

/**
 * Replaces a draft's memo and lines without posting it. Balances stay put, so
 * only the header and its line rows change; the outbox gets an UPDATE.
 */
export async function updateJournalDraft(input: {
  entryNo: string;
  memo: string;
  lines: JournalLineInput[];
}): Promise<boolean> {
  const rows = await query<{ id: string; status: string; posted_at: string }>(
    "SELECT id, status, posted_at FROM acc_journal_entries WHERE entry_no = " +
      sqlText(input.entryNo) +
      ";",
  );
  const entry = rows[0];
  if (!entry || entry.status !== "Draft") return false;

  const lines = cleanJournalLines(input.lines);
  const payload = journalPayload({
    entryNo: input.entryNo,
    memo: input.memo,
    postedAt: entry.posted_at,
    lines,
    status: "Draft",
  });

  await withWrite(async () => {
    await exec(`
BEGIN IMMEDIATE;
DELETE FROM acc_journal_lines WHERE entry_id = ${sqlText(entry.id)};
INSERT INTO acc_journal_lines (id, entry_id, account_id, debit_cents, credit_cents) VALUES
  ${journalLineValues(entry.id, lines)};
UPDATE acc_journal_entries SET memo = ${sqlText(input.memo)} WHERE id = ${sqlText(entry.id)};
INSERT INTO sync_outbox (id, service_name, entity_type, entity_id, operation, payload_json, idempotency_key, branch_id, terminal_id, created_at)
VALUES (${[
      ulid(),
      "accounting",
      "journal_entry",
      entry.id,
      "UPDATE",
      JSON.stringify(payload),
      TERMINAL_ID + ":journal_entry:" + input.entryNo + ":edited",
      BRANCH_ID,
      TERMINAL_ID,
      isoNow(),
    ].map(sqlText).join(", ")});
COMMIT;
`);
    await refreshCounts();
    patchSync({ writeCount: syncState().writeCount + 1 });
  });
  return true;
}

/**
 * Posts a mirror entry that swaps every debit for a credit. The original stays
 * in the ledger, so the pair nets to zero and the audit trail is intact.
 */
export async function reverseJournalEntry(input: {
  entryNo: string;
  reversalNo: string;
  postedAt?: string;
}): Promise<boolean> {
  const rows = await query<{ id: string; status: string; memo: string }>(
    "SELECT id, status, memo FROM acc_journal_entries WHERE entry_no = " +
      sqlText(input.entryNo) +
      ";",
  );
  const original = rows[0];
  if (!original || original.status === "Draft") return false;

  const stored = await query<{
    debit_cents: number;
    credit_cents: number;
    code: string;
  }>(`
SELECT l.debit_cents, l.credit_cents, a.code
FROM acc_journal_lines l
JOIN acc_accounts a ON a.id = l.account_id
WHERE l.entry_id = ${sqlText(original.id)};
`);
  if (stored.length === 0) return false;

  const lines = cleanJournalLines(
    stored.map((line) => ({
      accountCode: line.code,
      debitCents: Number(line.credit_cents),
      creditCents: Number(line.debit_cents),
    })),
  );
  const postedAt = input.postedAt ?? isoNow();
  const entryId = "JE_" + input.reversalNo.slice(3);
  const memo = "Reversal of " + input.entryNo;
  const payload = {
    ...journalPayload({ entryNo: input.reversalNo, memo, postedAt, lines }),
    source_type: "reversal",
    reverses: input.entryNo,
  };
  const balanceStatements = lines.map(journalBalanceSql).filter((sql) => sql !== "").join("\n");

  await withWrite(async () => {
    await exec(`
BEGIN IMMEDIATE;
INSERT INTO acc_journal_entries (id, entry_no, branch_id, source_type, source_id, memo, posted_at) VALUES (${[
      sqlText(entryId),
      sqlText(input.reversalNo),
      sqlText(BRANCH_ID),
      sqlText("reversal"),
      sqlText(original.id),
      sqlText(memo),
      sqlText(postedAt),
    ].join(", ")});
INSERT INTO acc_journal_lines (id, entry_id, account_id, debit_cents, credit_cents) VALUES
  ${journalLineValues(entryId, lines)};
${balanceStatements}
UPDATE sync_terminal_config SET value = ${sqlText(String(counters.je))} WHERE key = 'next_je_seq';
INSERT INTO sync_outbox (id, service_name, entity_type, entity_id, operation, payload_json, idempotency_key, branch_id, terminal_id, created_at)
VALUES (${[
      ulid(),
      "accounting",
      "journal_entry",
      entryId,
      "INSERT",
      JSON.stringify(payload),
      TERMINAL_ID + ":journal_entry:" + input.reversalNo,
      BRANCH_ID,
      TERMINAL_ID,
      postedAt,
    ].map(sqlText).join(", ")});
COMMIT;
`);
    await refreshCounts();
    patchSync({ writeCount: syncState().writeCount + 1 });
  });
  return true;
}

export interface JournalRow {
  ref: string;
  description: string;
  posted_at: string;
  debit: string;
  credit: string;
  amount_cents: number;
  status: string;
}

/** A branch transfer with its status and metadata. */
export interface Transfer {
  id: string;
  transfer_no: string;
  from_branch: string;
  to_branch: string;
  items_qty: number;
  value_cents: number;
  sent_at: string;
  status: string;
}

/** The structured debit/credit lines of one entry, for the editor. */
export async function loadJournalLines(entryNo: string): Promise<JournalLineInput[]> {
  const rows = await query<{
    account_code: string;
    debit_cents: number;
    credit_cents: number;
  }>(`
SELECT a.code AS account_code, l.debit_cents, l.credit_cents
FROM acc_journal_lines l
JOIN acc_journal_entries e ON e.id = l.entry_id
JOIN acc_accounts a ON a.id = l.account_id
WHERE e.entry_no = ${sqlText(entryNo)}
ORDER BY l.rowid;
`);
  return rows.map((row) => ({
    accountCode: row.account_code,
    debitCents: Number(row.debit_cents),
    creditCents: Number(row.credit_cents),
  }));
}

/** Posted journal entries with their account names, newest first. */
export async function loadJournal(limit = 50): Promise<JournalRow[]> {
  return query<JournalRow>(`
SELECT e.entry_no AS ref,
       e.memo AS description,
       e.posted_at,
       e.status,
       COALESCE((SELECT GROUP_CONCAT(a.code || ' ' || a.name, ' + ')
                 FROM acc_journal_lines l
                 JOIN acc_accounts a ON a.id = l.account_id
                 WHERE l.entry_id = e.id AND l.debit_cents > 0), '') AS debit,
       COALESCE((SELECT GROUP_CONCAT(a.code || ' ' || a.name, ' + ')
                 FROM acc_journal_lines l
                 JOIN acc_accounts a ON a.id = l.account_id
                 WHERE l.entry_id = e.id AND l.credit_cents > 0), '') AS credit,
       (SELECT COALESCE(SUM(l.debit_cents), 0)
        FROM acc_journal_lines l WHERE l.entry_id = e.id) AS amount_cents
FROM acc_journal_entries e
ORDER BY e.posted_at DESC, e.rowid DESC
LIMIT ${Math.max(1, Math.min(100, limit))};
`);
}

export interface BankLineRow {
  id: string;
  statement_date: string;
  description: string;
  reference: string;
  amount_cents: number;
  suggestion: string;
  matched: number;
  matched_entry_no: string | null;
}

/** The bank statement feed, newest first. */
export async function loadBankLines(limit = 100): Promise<BankLineRow[]> {
  return query<BankLineRow>(`
SELECT id, statement_date, description, reference, amount_cents,
       suggestion, matched, matched_entry_no
FROM acc_bank_lines
ORDER BY statement_date DESC, rowid DESC
LIMIT ${Math.max(1, Math.min(200, limit))};
`);
}

/** The 1010 bank balance the statement is reconciled against. */
export async function loadBankBalance(): Promise<number | null> {
  const rows = await query<{ balance_cents: number }>(
    "SELECT balance_cents FROM acc_accounts WHERE code = '1010';",
  );
  return rows[0] ? Number(rows[0].balance_cents) : null;
}

/** Clears or matches a statement line and queues the accounting mutation. */
export async function setBankLineMatched(input: {
  id: string;
  matched: boolean;
  entryNo?: string | null;
}): Promise<void> {
  const outboxId = ulid();
  await withWrite(async () => {
    await exec(`
BEGIN IMMEDIATE;
UPDATE acc_bank_lines SET matched = ${input.matched ? 1 : 0}, matched_entry_no = ${input.entryNo ? sqlText(input.entryNo) : "NULL"} WHERE id = ${sqlText(input.id)};
INSERT INTO sync_outbox (id, service_name, entity_type, entity_id, operation, payload_json, idempotency_key, branch_id, terminal_id, created_at)
VALUES (${[
      outboxId,
      "accounting",
      "bank_line",
      input.id,
      "UPDATE",
      JSON.stringify({ bank_line_id: input.id, matched: input.matched, matched_entry_no: input.entryNo ?? null }),
      TERMINAL_ID + ":bank_line:" + outboxId,
      BRANCH_ID,
      TERMINAL_ID,
      isoNow(),
    ].map(sqlText).join(", ")});
COMMIT;
`);
    await refreshCounts();
    patchSync({ writeCount: syncState().writeCount + 1 });
  });
}

export interface ExpenseRow {
  id: string;
  expense_date: string;
  vendor: string;
  category: string;
  account_code: string;
  amount_cents: number;
  method: string;
  status: string;
  entry_no: string | null;
  notes: string | null;
}

/** Coded expenses, newest first. */
export async function loadExpenses(limit = 50): Promise<ExpenseRow[]> {
  return query<ExpenseRow>(`
SELECT id, expense_date, vendor_name AS vendor, category, account_code,
       amount_cents, method, status, entry_no, notes
FROM acc_expenses
ORDER BY expense_date DESC, rowid DESC
LIMIT ${Math.max(1, Math.min(100, limit))};
`);
}

/**
 * Posts an expense: the coded row, its debit to the chosen account, the credit
 * to the tender and an accounting mutation, in one transaction.
 */
export async function recordExpense(input: {
  id: string;
  vendor: string;
  category: string;
  accountCode: string;
  amountCents: number;
  method: string;
  notes: string;
  spentAt: string;
  entryNo: string;
}): Promise<void> {
  const amount = Math.max(1, Math.round(input.amountCents));
  const credit =
    input.method === "Cash" ? "acct_1000" : input.method === "Card" ? "acct_1020" : "acct_1010";
  const creditCode = input.method === "Cash" ? "1000" : input.method === "Card" ? "1020" : "1010";
  const debit = "acct_" + input.accountCode;
  const entryId = "JE_" + input.entryNo.slice(3);
  const memo = "Expense · " + input.vendor;
  const expensePayload = {
    expense_id: input.id,
    vendor: input.vendor,
    category: input.category,
    account_code: input.accountCode,
    amount_cents: amount,
    method: input.method,
    expense_date: input.spentAt,
  };
  const journalPayload = {
    entry_no: input.entryNo,
    source_type: "expense",
    source_id: input.id,
    memo,
    posted_at: input.spentAt,
    lines: [
      { account_code: input.accountCode, debit_cents: amount, credit_cents: 0 },
      { account_code: creditCode, debit_cents: 0, credit_cents: amount },
    ],
  };

  await withWrite(async () => {
    await exec(`
BEGIN IMMEDIATE;
INSERT INTO acc_expenses (id, branch_id, category, vendor_name, amount_cents, expense_date, notes, account_code, method, status, entry_no, created_at) VALUES (${[
      input.id,
      BRANCH_ID,
      input.category,
      input.vendor,
      String(amount),
      input.spentAt,
      input.notes,
      input.accountCode,
      input.method,
      "Paid",
      input.entryNo,
      input.spentAt,
    ].map(sqlText).join(", ")});
INSERT INTO acc_journal_entries (id, entry_no, branch_id, source_type, source_id, memo, posted_at) VALUES (${[
      entryId,
      input.entryNo,
      BRANCH_ID,
      "expense",
      input.id,
      memo,
      input.spentAt,
    ].map(sqlText).join(", ")});
INSERT INTO acc_journal_lines (id, entry_id, account_id, debit_cents, credit_cents) VALUES
  (${[rowId("jl"), entryId, debit, String(amount), "0"].map(sqlText).join(", ")}),
  (${[rowId("jl"), entryId, credit, "0", String(amount)].map(sqlText).join(", ")});
UPDATE acc_accounts SET balance_cents = balance_cents + ${amount} WHERE id = ${sqlText(debit)};
UPDATE acc_accounts SET balance_cents = balance_cents - ${amount} WHERE id = ${sqlText(credit)};
UPDATE sync_terminal_config SET value = ${sqlText(String(counters.je))} WHERE key = 'next_je_seq';
INSERT INTO sync_outbox (id, service_name, entity_type, entity_id, operation, payload_json, idempotency_key, branch_id, terminal_id, created_at) VALUES
  (${[
    ulid(), "accounting", "expense", input.id, "INSERT",
    JSON.stringify(expensePayload),
    TERMINAL_ID + ":expense:" + input.id, BRANCH_ID, TERMINAL_ID, input.spentAt,
  ].map(sqlText).join(", ")}),
  (${[
    ulid(), "accounting", "journal_entry", entryId, "INSERT",
    JSON.stringify(journalPayload),
    TERMINAL_ID + ":journal_entry:" + input.entryNo, BRANCH_ID, TERMINAL_ID, input.spentAt,
  ].map(sqlText).join(", ")});
COMMIT;
`);
    await refreshCounts();
    patchSync({ writeCount: syncState().writeCount + 1 });
  });
}

export interface AccountRow {
  code: string;
  name: string;
  type: string;
  balance_cents: number;
}

/** The chart of accounts with its live posted balances. */
export async function loadAccounts(): Promise<AccountRow[]> {
  return query<AccountRow>(
    "SELECT code, name, type, balance_cents FROM acc_accounts ORDER BY code;",
  );
}

export interface TaxTotals {
  collectedCents: number;
  paidCents: number;
}

/** GST collected and paid: the opening position plus every 2100 posting. */
export async function loadTaxTotals(): Promise<TaxTotals> {
  const rows = await query<{ collected: number; paid: number }>(`
SELECT
  COALESCE((SELECT CAST(value AS INTEGER) FROM sync_terminal_config WHERE key = 'gst_collected_cents'), 0) +
  COALESCE((SELECT SUM(l.credit_cents)
            FROM acc_journal_lines l JOIN acc_accounts a ON a.id = l.account_id
            WHERE a.code = '2100'), 0) AS collected,
  COALESCE((SELECT CAST(value AS INTEGER) FROM sync_terminal_config WHERE key = 'gst_paid_cents'), 0) +
  COALESCE((SELECT SUM(l.debit_cents)
            FROM acc_journal_lines l JOIN acc_accounts a ON a.id = l.account_id
            WHERE a.code = '2100'), 0) AS paid;
`);
  return {
    collectedCents: Number(rows[0]?.collected ?? 0),
    paidCents: Number(rows[0]?.paid ?? 0),
  };
}

export interface InventoryRow {
  sku: string;
  name: string;
  category: string;
  unit: string;
  reorder_level: number;
  cost_cents: number;
  qty_on_hand: number;
  supplier_id: string | null;
  supplier_name: string | null;
}

export async function loadInventory(): Promise<InventoryRow[]> {
  return query<InventoryRow>(`
SELECT i.sku, i.name, i.category, i.unit, i.reorder_level, i.cost_cents,
       i.supplier_id,
       s.name AS supplier_name,
       COALESCE(b.qty_on_hand, 0) AS qty_on_hand
FROM inv_items i
LEFT JOIN inv_suppliers s ON s.id = i.supplier_id
LEFT JOIN inv_stock_balances b ON b.item_id = i.id AND b.branch_id = ${sqlText(BRANCH_ID)}
ORDER BY i.sku;
`);
}

/** Updates an item's par/cost and its on-hand balance for this branch. */
export async function saveStockItem(input: {
  sku: string;
  par: number;
  unitCostCents: number;
  onHand: number;
}): Promise<void> {
  const rows = await query<{ id: string }>(
    "SELECT id FROM inv_items WHERE sku = " + sqlText(input.sku) + ";",
  );
  const item = rows[0];
  if (!item) return;
  const now = isoNow();
  await withWrite(async () => {
    await exec(`
BEGIN IMMEDIATE;
UPDATE inv_items SET reorder_level = ${input.par}, cost_cents = ${Math.round(input.unitCostCents)}, updated_at = ${sqlText(now)} WHERE id = ${sqlText(item.id)};
INSERT INTO inv_stock_balances (branch_id, item_id, qty_on_hand, updated_at) VALUES (${[
      BRANCH_ID,
      item.id,
      String(input.onHand),
      now,
    ]
      .map(sqlText)
      .join(", ")})
ON CONFLICT(branch_id, item_id) DO UPDATE SET qty_on_hand = excluded.qty_on_hand, updated_at = excluded.updated_at;
COMMIT;
`);
    patchSync({ writeCount: syncState().writeCount + 1 });
  });
}

export interface LedgerRow {
  created_at: string;
  ref_type: string;
  ref_id: string;
  delta_qty: number;
}

export async function loadLedger(sku: string, limit = 12): Promise<LedgerRow[]> {
  return query<LedgerRow>(`
SELECT l.created_at, l.ref_type, l.ref_id, l.delta_qty
FROM inv_stock_ledger l
JOIN inv_items i ON i.id = l.item_id
WHERE i.sku = ${sqlText(sku)} AND l.branch_id = ${sqlText(BRANCH_ID)}
ORDER BY l.created_at DESC, l.rowid DESC
LIMIT ${Math.max(1, Math.min(50, limit))};
`);
}

/** Posts a stock adjustment: balance, ledger, adjustment row and outbox. */
export async function postAdjustment(input: {
  sku: string;
  adjNo: string;
  reason: string;
  deltaQty: number;
  notes: string;
}): Promise<void> {
  const rows = await query<{ id: string }>(
    "SELECT id FROM inv_items WHERE sku = " + sqlText(input.sku) + ";",
  );
  const item = rows[0];
  if (!item) return;
  const now = isoNow();
  const adjId = ulid();
  await withWrite(async () => {
    await exec(`
BEGIN IMMEDIATE;
INSERT INTO inv_adjustments (id, adj_no, branch_id, item_id, reason, delta_qty, notes, created_at) VALUES (${[
      adjId,
      input.adjNo,
      BRANCH_ID,
      item.id,
      input.reason,
      String(input.deltaQty),
      input.notes,
      now,
    ]
      .map(sqlText)
      .join(", ")});
INSERT INTO inv_stock_ledger (id, branch_id, item_id, delta_qty, ref_type, ref_id, created_at) VALUES (${[
      ulid(),
      BRANCH_ID,
      item.id,
      String(input.deltaQty),
      "adjustment",
      input.adjNo,
      now,
    ]
      .map(sqlText)
      .join(", ")});
INSERT INTO inv_stock_balances (branch_id, item_id, qty_on_hand, updated_at) VALUES (${[
      BRANCH_ID,
      item.id,
      String(input.deltaQty),
      now,
    ]
      .map(sqlText)
      .join(", ")})
ON CONFLICT(branch_id, item_id) DO UPDATE SET qty_on_hand = qty_on_hand + ${input.deltaQty}, updated_at = excluded.updated_at;
INSERT INTO sync_outbox (id, service_name, entity_type, entity_id, operation, payload_json, idempotency_key, branch_id, terminal_id, created_at)
VALUES (${[
      ulid(),
      "inventory",
      "stock_adjustment",
      adjId,
      "INSERT",
      JSON.stringify({
        adj_no: input.adjNo,
        sku: input.sku,
        reason: input.reason,
        delta_qty: input.deltaQty,
        notes: input.notes,
      }),
      TERMINAL_ID + ":stock_adjustment:" + adjId,
      BRANCH_ID,
      TERMINAL_ID,
      now,
    ]
      .map(sqlText)
      .join(", ")});
UPDATE sync_terminal_config SET value = ${sqlText(String(counters.adj))} WHERE key = 'next_adj_seq';
COMMIT;
`);
    await refreshCounts();
    patchSync({ writeCount: syncState().writeCount + 1 });
  });
}

/**
 * A few opening movements, so an item's ledger has history on first run.
 */
function seedLedger(): string {  const now = isoNow();
  const rows: [string, string, number, string][] = [
    ["item_bev-001", "grn", 12.5, "GRN-2026-0116"],
    ["item_bev-001", "sale_bom", -1.4, "BOM-9:12"],
    ["item_dai-010", "grn", 24, "GRN-2026-0118"],
    ["item_dai-011", "adjustment", -2, "ADJ-2026-0060"],
    ["item_bak-022", "grn", 12, "GRN-2026-0117"],
    ["item_bak-020", "sale_bom", -3.2, "BOM-8:40"],
    ["item_pap-041", "transfer", -8, "TRF-2026-0032"],
    ["item_syr-031", "adjustment", -1, "ADJ-2026-0059"],
  ];
  return rows
    .map(
      ([itemId, type, delta, ref]) =>
        "INSERT INTO inv_stock_ledger (id, branch_id, item_id, delta_qty, ref_type, ref_id, created_at) VALUES (" +
        [
          ulid(),
          BRANCH_ID,
          itemId,
          String(delta),
          type,
          ref,
          now,
        ]
          .map(sqlText)
          .join(", ") +
        ");",
    )
    .join("\n");
}

/** Opening supplier bills that match the design's payables list. */
function seedVendorBills(): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return payables
    .map((bill) => {
      const [month, day] = bill.due.split(" ");
      const due = new Date(
        2026,
        Math.max(0, months.indexOf(month)),
        Number(day) || 1,
        12,
      ).toISOString();
      const created = new Date(new Date(due).getTime() - 14 * 86_400_000).toISOString();
      const supplierId = suppliers.find((entry) => entry.name === bill.vendor)?.id ?? "sup-1";
      const id = "bill_seed_" + bill.invoice.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      return (
        "INSERT OR IGNORE INTO acc_vendor_bills (id, bill_no, grn_id, supplier_id, due_date, total_cents, paid_cents, status, created_at) VALUES (" +
        [
          sqlText(id),
          sqlText(bill.invoice),
          "NULL",
          sqlText(supplierId),
          sqlText(due),
          String(Math.round(bill.amount * 100)),
          "0",
          "'Open'",
          sqlText(created),
        ].join(", ") +
        ");"
      );
    })
    .join("\n");
}

/** Stable id for a seeded statement line, shared by the seed and the UI fallback. */
export function bankLineId(reference: string): string {
  return "bank_seed_" + reference.toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

/** The design's bank feed, so reconciliation starts with real statement rows. */
function seedBankLines(): string {
  const now = isoNow();
  return bankLines
    .map((line) => {
      const day = Number(line.date.split(" ")[1]) || 1;
      const date = new Date(2026, 10, day, 12).toISOString();
      const id = bankLineId(line.reference);
      return (
        "INSERT OR IGNORE INTO acc_bank_lines (id, branch_id, statement_date, description, reference, amount_cents, suggestion, matched, matched_entry_no, created_at) VALUES (" +
        [
          sqlText(id),
          sqlText(BRANCH_ID),
          sqlText(date),
          sqlText(line.description),
          sqlText(line.reference),
          String(Math.round(line.amount * 100)),
          sqlText(line.suggestion),
          line.matched ? "1" : "0",
          "NULL",
          sqlText(now),
        ].join(", ") +
        ");"
      );
    })
    .join("\n");
}

/** The design's expense list, so the ledger has coded running costs on first run. */
function seedExpenses(): string {
  const now = isoNow();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return expenses
    .map((expense, index) => {
      const [month, day] = expense.date.split(" ");
      const date = new Date(
        2026,
        Math.max(0, months.indexOf(month)),
        Number(day) || 1,
        12,
      ).toISOString();
      return (
        "INSERT OR IGNORE INTO acc_expenses (id, branch_id, category, vendor_name, amount_cents, expense_date, notes, account_code, method, status, entry_no, created_at) VALUES (" +
        [
          sqlText("expense_seed_" + (index + 1)),
          sqlText(BRANCH_ID),
          sqlText(expense.category),
          sqlText(expense.vendor),
          String(Math.round(expense.amount * 100)),
          sqlText(date),
          sqlText(""),
          sqlText(expense.account),
          sqlText(expense.method),
          sqlText(expense.status),
          "NULL",
          sqlText(now),
        ].join(", ") +
        ");"
      );
    })
    .join("\n");
}

export interface ProductRow {
  id: string;
  name: string;
  category: string;
  note: string;
  price_cents: number;
  emoji: string;
  tint: string;
  badge: string | null;
  sold_today: number;
  is_active: number;
}

export async function loadProducts(): Promise<ProductRow[]> {
  return query<ProductRow>(
    "SELECT id, name, category, note, price_cents, emoji, tint, badge, sold_today, is_active FROM pos_products ORDER BY rowid;",
  );
}

export async function upsertProductRow(product: {
  id: string;
  name: string;
  category: string;
  note: string;
  priceCents: number;
  emoji: string;
  tint: string;
  badge: string | null;
  soldToday: number;
}): Promise<void> {
  await withWrite(() =>
    exec(
      "INSERT INTO pos_products (id, name, category, note, price_cents, emoji, tint, badge, sold_today, is_active) VALUES (" +
        [
          sqlText(product.id),
          sqlText(product.name),
          sqlText(product.category),
          sqlText(product.note),
          String(product.priceCents),
          sqlText(product.emoji),
          sqlText(product.tint),
          product.badge ? sqlText(product.badge) : "NULL",
          String(product.soldToday),
          product.badge === "Sold out" ? "0" : "1",
        ].join(", ") +
        ") ON CONFLICT(id) DO UPDATE SET name = excluded.name, category = excluded.category, note = excluded.note, price_cents = excluded.price_cents, emoji = excluded.emoji, tint = excluded.tint, badge = excluded.badge, sold_today = excluded.sold_today, is_active = excluded.is_active;",
    ),
  );
  patchSync({ writeCount: syncState().writeCount + 1 });
}

export interface InvoiceLineRow {
  description: string;
  qty: number;
  unit_price_cents: number;
  amount_cents: number;
}

/** The stored lines of one invoice, for the sale drawer. */
export async function invoiceLines(invoiceNo: string): Promise<InvoiceLineRow[]> {
  return query<InvoiceLineRow>(`
SELECT i.description, i.qty, i.unit_price_cents, i.amount_cents
FROM pos_sale_invoice_items i
JOIN pos_sale_invoices v ON v.id = i.invoice_id
WHERE v.invoice_no = ${sqlText(invoiceNo)}
ORDER BY i.rowid;
`);
}

export async function outboxList(limit = 100): Promise<OutboxRow[]> {
  return query<OutboxRow>(
    "SELECT * FROM sync_outbox ORDER BY created_at DESC LIMIT " + Math.max(1, Math.min(500, limit)) + ";",
  );
}

export async function pendingBatch(limit = 50): Promise<OutboxRow[]> {
  return query<OutboxRow>(`
SELECT * FROM sync_outbox
WHERE status IN ('pending', 'in_flight')
  AND attempts < 8
  AND (next_retry_at IS NULL OR next_retry_at <= ${sqlText(isoNow())})
ORDER BY created_at ASC
LIMIT ${Math.max(1, Math.min(50, limit))};
`);
}

export async function markAcked(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await withWrite(() =>
    exec(
      "UPDATE sync_outbox SET status = 'acked', last_error = NULL WHERE id IN (" +
        ids.map(sqlText).join(", ") +
        ");",
    ),
  );
}

export interface SyncEvent {
  service_name: string;
  seq: number;
  entity_type: string;
  entity_id: string;
  operation: string;
  data: Record<string, unknown>;
}

export async function markInFlight(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await withWrite(() =>
    exec(
      "UPDATE sync_outbox SET status = 'in_flight' WHERE id IN (" +
        ids.map(sqlText).join(", ") +
        ");",
    ),
  );
}

export async function cursorMap(): Promise<{
  sale: number;
  inventory: number;
  accounting: number;
}> {
  const rows = await query<{ service_name: string; last_seq: number }>(
    "SELECT service_name, last_seq FROM sync_cursors;",
  );
  const map = { sale: 0, inventory: 0, accounting: 0 };
  for (const row of rows) {
    if (row.service_name === "sale") map.sale = Number(row.last_seq);
    if (row.service_name === "inventory") map.inventory = Number(row.last_seq);
    if (row.service_name === "accounting") map.accounting = Number(row.last_seq);
  }
  return map;
}

function sqlValue(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "1" : "0";
  return sqlText(String(value));
}

/** Applies a pull page to the local read models and advances the cursors. */
export async function applyEvents(
  events: SyncEvent[],
  next: { sale?: number; inventory?: number; accounting?: number },
): Promise<void> {
  const now = isoNow();
  const statements: string[] = [];

  for (const event of events) {
    const data = event.data ?? {};
    if (event.entity_type === "inv_stock_balances") {
      statements.push(
        "INSERT INTO inv_stock_balances (branch_id, item_id, qty_on_hand, updated_at) VALUES (" +
          [data.branch_id, data.item_id, data.qty_on_hand, data.updated_at ?? now]
            .map(sqlValue)
            .join(", ") +
          ") ON CONFLICT(branch_id, item_id) DO UPDATE SET qty_on_hand = excluded.qty_on_hand, updated_at = excluded.updated_at;",
      );
    } else if (event.entity_type === "pos_customers") {
      statements.push(
        "INSERT INTO pos_customers (id, name, phone, ntn_tax_id, loyalty_stamps, store_credit_cents, tier, updated_at) VALUES (" +
          [
            data.id ?? event.entity_id,
            data.name ?? "",
            data.phone,
            data.ntn_tax_id,
            data.loyalty_stamps ?? 0,
            data.store_credit_cents ?? 0,
            data.tier ?? "Member",
            data.updated_at ?? now,
          ]
            .map(sqlValue)
            .join(", ") +
          ") ON CONFLICT(id) DO UPDATE SET name = excluded.name, phone = excluded.phone, loyalty_stamps = excluded.loyalty_stamps, store_credit_cents = excluded.store_credit_cents, tier = excluded.tier, updated_at = excluded.updated_at;",
      );
    } else if (event.entity_type === "pos_products") {
      statements.push(
        "INSERT INTO pos_products (id, name, category, note, price_cents, emoji, tint, is_active) VALUES (" +
          [
            data.id ?? event.entity_id,
            data.name ?? "",
            data.category ?? "Coffee",
            data.note ?? "",
            data.price_cents ?? 0,
            data.emoji ?? "☕",
            data.tint ?? "#F7EDE9",
            data.is_active ?? 1,
          ]
            .map(sqlValue)
            .join(", ") +
          ") ON CONFLICT(id) DO UPDATE SET name = excluded.name, price_cents = excluded.price_cents, is_active = excluded.is_active;",
      );
    }
  }

  for (const [name, seq] of [
    ["sale", next.sale],
    ["inventory", next.inventory],
    ["accounting", next.accounting],
  ] as [string, number | undefined][]) {
    if (seq === undefined) continue;
    statements.push(
      "INSERT INTO sync_cursors (service_name, last_seq, last_synced_at) VALUES (" +
        [name, seq, now].map(sqlValue).join(", ") +
        ") ON CONFLICT(service_name) DO UPDATE SET last_seq = excluded.last_seq, last_synced_at = excluded.last_synced_at;",
    );
  }

  if (statements.length === 0) return;
  await withWrite(() =>
    exec("BEGIN IMMEDIATE;\n" + statements.join("\n") + "\nCOMMIT;"),
  );
}

export async function markRetry(ids: string[], error: string, delaySeconds: number): Promise<void> {  if (ids.length === 0) return;
  const retryAt = new Date(Date.now() + delaySeconds * 1000).toISOString();
  await withWrite(() =>
    exec(
      "UPDATE sync_outbox SET status = 'pending', attempts = attempts + 1, last_error = " +
        sqlText(error) +
        ", next_retry_at = " +
        sqlText(retryAt) +
        " WHERE id IN (" +
        ids.map(sqlText).join(", ") +
        ");",
    ),
  );
}

export async function markConflict(row: OutboxRow, reason: string, snapshot: unknown): Promise<void> {
  await withWrite(() =>
    exec(`
BEGIN IMMEDIATE;
UPDATE sync_outbox SET status = 'conflict', last_error = ${sqlText(reason)} WHERE id = ${sqlText(row.id)};
INSERT INTO sync_conflicts (id, outbox_id, entity_type, entity_id, reason, server_snapshot_json, resolved, created_at)
VALUES (${[
      sqlText(ulid()),
      sqlText(row.id),
      sqlText(row.entity_type),
      sqlText(row.entity_id),
      sqlText(reason),
      sqlText(JSON.stringify(snapshot ?? {})),
      "0",
      sqlText(isoNow()),
    ].join(", ")});
COMMIT;
`),
  );
}

export async function conflictList(): Promise<ConflictRow[]> {
  return query<ConflictRow>(
    "SELECT * FROM sync_conflicts WHERE resolved = 0 ORDER BY created_at DESC LIMIT 20;",
  );
}

export async function retryOutbox(id: string): Promise<void> {
  await withWrite(() =>
    exec(
      "UPDATE sync_outbox SET status = 'pending', attempts = 0, next_retry_at = NULL, last_error = NULL WHERE id = " +
        sqlText(id) +
        ";",
    ),
  );
}

export async function discardOutbox(id: string): Promise<void> {
  await withWrite(() => exec("DELETE FROM sync_outbox WHERE id = " + sqlText(id) + ";"));
}

export async function seedTransfers(): Promise<void> {
  const now = isoNow();
  const lines: string[] = [];
  lines.push(
    "INSERT OR IGNORE INTO inv_transfers (id, transfer_no, from_branch, to_branch, items_qty, value_cents, sent_at, status) VALUES " +
      [
        "(lower('trf-2026-0032'), 'TRF-2026-0032', 'Gulberg Café', 'DHA Phase 5', 3, 18420, '2026-11-26T07:00:00Z', 'In transit')",
        "(lower('trf-2026-0031'), 'TRF-2026-0031', 'Gulberg Café', 'Johar Town', 5, 31280, '2026-11-25T18:30:00Z', 'Received')",
        "(lower('trf-2026-0030'), 'TRF-2026-0030', 'DHA Phase 5', 'Gulberg Café', 2, 9600, '2026-11-22T10:15:00Z', 'Received')",
      ].join(",\n  ") +
    ";",
  );
  await withWrite(async () => {
    await exec("BEGIN IMMEDIATE;\n" + lines.join("\n") + "\nCOMMIT;");
    await refreshCounts();
    patchSync({ writeCount: syncState().writeCount + 1 });
  });
}

export async function loadTransfers(): Promise<Transfer[]> {
  return query<Transfer>(`
SELECT id, transfer_no, from_branch, to_branch, items_qty, value_cents, sent_at, status
FROM inv_transfers
ORDER BY sent_at DESC
`);
}

export interface SupplierRow {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  ntn_tax_id: string | null;
  payment_terms: string | null;
  updated_at: string;
  lead_days: number;
  rating: number;
  last_delivery: string;
  payable: number;
  audit: string;
  items: number;
}

export type { Supplier } from "../data/ops";

export async function loadSuppliers(): Promise<Supplier[]> {
  return query<Supplier>(`
SELECT id, name, contact_name, phone, lead_days, rating, last_delivery, payable, audit, items
FROM inv_suppliers
ORDER BY name ASC
`);
}

export async function seedSuppliers(): Promise<void> {
  const now = isoNow();
  const lines: string[] = [];
  const supplierData = [
    { id: "sup-1", name: "Café Imports", contact_name: "Imran Sheikh", phone: "+92 300 2211334", lead_days: 3, rating: 4.8, last_delivery: "Nov 22", payable: 1840.0, audit: "Verified", items: 8 },
    { id: "sup-2", name: "Nestlé Dairy", contact_name: "Adeel Raza", phone: "+92 321 7788990", lead_days: 1, rating: 4.6, last_delivery: "Today", payable: 620.5, audit: "Due", items: 6 },
    { id: "sup-3", name: "Golden Crumb", contact_name: "Nida Aslam", phone: "+92 333 4455661", lead_days: 2, rating: 4.9, last_delivery: "Nov 23", payable: 0, audit: "Verified", items: 12 },
    { id: "sup-4", name: "Bar Essentials", contact_name: "Kamran Ali", phone: "+92 345 1122345", lead_days: 5, rating: 4.1, last_delivery: "Nov 15", payable: 2140.0, audit: "Overdue", items: 9 },
    { id: "sup-5", name: "EcoPack", contact_name: "Sadaf Iqbal", phone: "+92 302 6677889", lead_days: 4, rating: 4.4, last_delivery: "Nov 18", payable: 980.0, audit: "Verified", items: 5 },
  ];
  for (const s of supplierData) {
    lines.push(
      "INSERT OR IGNORE INTO inv_suppliers (id, name, contact_name, phone, lead_days, rating, last_delivery, payable, audit, items, updated_at) VALUES (" +
        [
          sqlText(s.id),
          sqlText(s.name),
          sqlText(s.contact_name),
          sqlText(s.phone),
          String(s.lead_days),
          String(s.rating),
          sqlText(s.last_delivery),
          String(s.payable),
          sqlText(s.audit),
          String(s.items),
          sqlText(now),
        ].join(", ") + ");",
    );
  }
  await withWrite(async () => {
    await exec("BEGIN IMMEDIATE;\n" + lines.join("\n") + "\nCOMMIT;");
    await refreshCounts();
    patchSync({ writeCount: syncState().writeCount + 1 });
  });
}

/** A menu recipe / BOM, with costed components. */
export interface Recipe {
  product: string;
  product_name?: string;
  category: string;
  components?: { name: string; qty: string; cost: number }[];
  price: number;
  cost: number;
  margin: number;
}

/** Recipes read from the SQLite inventory catalog. */
export async function loadRecipes(): Promise<Recipe[]> {
  return query<Recipe>(`
SELECT product_id AS product, product_name, category, price_cents / 100 AS price, cost_cents / 100 AS cost, margin
FROM inv_recipes
`);
}

export async function seedRecipes(): Promise<void> {
  const now = isoNow();
  const lines: string[] = [];
  for (const recipe of recipes) {
    const slug = recipe.product.toLowerCase().replace(/\\s+/g, "-");
    lines.push(
      "INSERT OR IGNORE INTO inv_recipes (product_id, product_name, updated_at, category, price_cents, cost_cents, margin) VALUES (" +
        [
          sqlText(slug),
          sqlText(recipe.product),
          sqlText(now),
          sqlText(recipe.category),
          String(Math.round(recipe.price * 100)),
          String(Math.round(recipe.cost * 100)),
          String(Math.round(recipe.margin * 100)),
        ].join(", ") + ");",
    );
  }
  await withWrite(async () => {
    await exec("BEGIN IMMEDIATE;\n" + lines.join("\n") + "\nCOMMIT;");
    await refreshCounts();
    patchSync({ writeCount: syncState().writeCount + 1 });
  });
}

export async function seedCounts(): Promise<{ products: number; accounts: number; stock: number }> {
  const rows = await query<{ products: number; accounts: number; stock: number }>(
    "SELECT (SELECT COUNT(*) FROM pos_products) AS products, (SELECT COUNT(*) FROM acc_accounts) AS accounts, (SELECT COUNT(*) FROM inv_items) AS stock;",
  );
  return rows[0] ?? { products: 0, accounts: 0, stock: 0 };
}

export async function loadAdjustments(): Promise<Adjustment[]> {
  return query<Adjustment>(`
SELECT adj_no, branch_id, item_id, reason, delta_qty, notes, created_at
FROM inv_adjustments
ORDER BY created_at DESC
`);
}

export async function saveAdjustment(input: {
  adjNo: string;
  branchId: string;
  itemId: string;
  reason: string;
  deltaQty: number;
  notes?: string;
}): Promise<void> {
  await withWrite(async () => {
    await exec(`
BEGIN IMMEDIATE;
INSERT INTO inv_adjustments (id, adj_no, branch_id, item_id, reason, delta_qty, notes, created_at)
VALUES (lower('adj-${input.adjNo}'), ${sqlText(input.adjNo)}, ${sqlText(input.branchId)}, ${sqlText(input.itemId)}, ${sqlText(input.reason)}, ${String(input.deltaQty)}, ${input.notes ? sqlText(input.notes) : "NULL"}, ${sqlText(isoNow())});
INSERT INTO sync_outbox (id, service_name, entity_type, entity_id, operation, payload_json, idempotency_key, branch_id, terminal_id, created_at)
VALUES (${[ulid(), "accounting", "adjustment", input.adjNo, "INSERT", JSON.stringify({ adjNo: input.adjNo, deltaQty: input.deltaQty, notes: input.notes }), TERMINAL_ID + ":adjustment:" + input.adjNo, BRANCH_ID, TERMINAL_ID, isoNow()].map(sqlText).join(", ")});
COMMIT;
`);
    await refreshCounts();
    patchSync({ writeCount: syncState().writeCount + 1 });
  });
}
