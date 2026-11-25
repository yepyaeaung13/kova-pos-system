/**
 * Local SQLite schema, transcribed from the export's
 * `SQLITE_DDL_SYNC_API_SPEC.md` (sections 2–5) plus a catalog read model.
 *
 * Money is integer minor units (`*_cents`), ids are ULIDs generated on the
 * client, timestamps are ISO-8601 UTC. Everything is `IF NOT EXISTS` so a
 * half-applied batch is safe to retry.
 */

export interface Migration {
  id: number;
  name: string;
  sql: string;
}

const sync = `
CREATE TABLE IF NOT EXISTS sync_terminal_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_outbox (
  id TEXT PRIMARY KEY,
  service_name TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  idempotency_key TEXT UNIQUE NOT NULL,
  branch_id TEXT NOT NULL,
  terminal_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_retry_at TEXT,
  last_error TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_outbox_status_created
  ON sync_outbox (status, created_at);

CREATE TABLE IF NOT EXISTS sync_cursors (
  service_name TEXT PRIMARY KEY,
  last_seq INTEGER NOT NULL DEFAULT 0,
  last_synced_at TEXT
);

INSERT OR IGNORE INTO sync_cursors (service_name, last_seq) VALUES
  ('sale', 0),
  ('inventory', 0),
  ('accounting', 0);

CREATE TABLE IF NOT EXISTS sync_conflicts (
  id TEXT PRIMARY KEY,
  outbox_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  server_snapshot_json TEXT,
  resolved INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
`;

const sale = `
CREATE TABLE IF NOT EXISTS pos_shifts (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  terminal_id TEXT NOT NULL,
  cashier_id TEXT NOT NULL,
  opening_float_cents INTEGER NOT NULL DEFAULT 0,
  counted_cash_cents INTEGER,
  status TEXT NOT NULL DEFAULT 'open',
  opened_at TEXT NOT NULL,
  closed_at TEXT
);

CREATE TABLE IF NOT EXISTS pos_customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  ntn_tax_id TEXT,
  loyalty_stamps INTEGER NOT NULL DEFAULT 0,
  store_credit_cents INTEGER NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'Member',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pos_orders (
  id TEXT PRIMARY KEY,
  order_no TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  shift_id TEXT REFERENCES pos_shifts(id),
  customer_id TEXT REFERENCES pos_customers(id),
  channel TEXT NOT NULL,
  table_label TEXT,
  status TEXT NOT NULL,
  subtotal_cents INTEGER NOT NULL,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  promo_code TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pos_order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES pos_orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  modifiers_json TEXT,
  qty REAL NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  line_total_cents INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS pos_sale_invoices (
  id TEXT PRIMARY KEY,
  invoice_no TEXT UNIQUE NOT NULL,
  branch_id TEXT NOT NULL,
  order_id TEXT REFERENCES pos_orders(id),
  customer_name TEXT NOT NULL,
  customer_ntn TEXT,
  paper_size TEXT NOT NULL DEFAULT 'A4',
  payment_terms TEXT NOT NULL DEFAULT 'Paid',
  subtotal_cents INTEGER NOT NULL,
  gst_cents INTEGER NOT NULL,
  grand_total_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'Paid',
  issued_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pos_sale_invoice_items (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES pos_sale_invoices(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  description TEXT NOT NULL,
  qty REAL NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS pos_payments (
  id TEXT PRIMARY KEY,
  order_id TEXT REFERENCES pos_orders(id),
  invoice_id TEXT REFERENCES pos_sale_invoices(id),
  method TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  tendered_cents INTEGER,
  change_cents INTEGER,
  paid_at TEXT NOT NULL
);

-- Local read model of the menu, so the register works with no network.
CREATE TABLE IF NOT EXISTS pos_products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  note TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  emoji TEXT NOT NULL,
  tint TEXT NOT NULL,
  badge TEXT,
  sold_today INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1
);
`;

const inventory = `
CREATE TABLE IF NOT EXISTS inv_suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  ntn_tax_id TEXT,
  payment_terms TEXT DEFAULT 'Net 15',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS inv_items (
  id TEXT PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  reorder_level REAL NOT NULL DEFAULT 0,
  cost_cents INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS inv_stock_balances (
  branch_id TEXT NOT NULL,
  item_id TEXT NOT NULL REFERENCES inv_items(id),
  qty_on_hand REAL NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (branch_id, item_id)
);

CREATE TABLE IF NOT EXISTS inv_stock_ledger (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  item_id TEXT NOT NULL REFERENCES inv_items(id),
  delta_qty REAL NOT NULL,
  ref_type TEXT NOT NULL,
  ref_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS inv_recipes (
  id TEXT PRIMARY KEY,
  product_id TEXT UNIQUE NOT NULL,
  product_name TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS inv_recipe_lines (
  id TEXT PRIMARY KEY,
  recipe_id TEXT NOT NULL REFERENCES inv_recipes(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES inv_items(id),
  qty_required REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS inv_grns (
  id TEXT PRIMARY KEY,
  grn_no TEXT UNIQUE NOT NULL,
  branch_id TEXT NOT NULL,
  supplier_id TEXT NOT NULL REFERENCES inv_suppliers(id),
  supplier_invoice_no TEXT NOT NULL,
  received_date TEXT NOT NULL,
  subtotal_cents INTEGER NOT NULL,
  tax_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'Unpaid',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS inv_grn_items (
  id TEXT PRIMARY KEY,
  grn_id TEXT NOT NULL REFERENCES inv_grns(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES inv_items(id),
  qty_received REAL NOT NULL,
  unit_cost_cents INTEGER NOT NULL,
  line_total_cents INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS inv_adjustments (
  id TEXT PRIMARY KEY,
  adj_no TEXT UNIQUE NOT NULL,
  branch_id TEXT NOT NULL,
  item_id TEXT NOT NULL REFERENCES inv_items(id),
  reason TEXT NOT NULL,
  delta_qty REAL NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL
);
`;

const accounting = `
CREATE TABLE IF NOT EXISTS acc_accounts (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  balance_cents INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS acc_journal_entries (
  id TEXT PRIMARY KEY,
  entry_no TEXT UNIQUE NOT NULL,
  branch_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT,
  memo TEXT NOT NULL,
  posted_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS acc_journal_lines (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES acc_journal_entries(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES acc_accounts(id),
  debit_cents INTEGER NOT NULL DEFAULT 0,
  credit_cents INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS acc_vendor_bills (
  id TEXT PRIMARY KEY,
  bill_no TEXT NOT NULL,
  grn_id TEXT,
  supplier_id TEXT NOT NULL,
  due_date TEXT NOT NULL,
  total_cents INTEGER NOT NULL,
  paid_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Open'
);

CREATE TABLE IF NOT EXISTS acc_expenses (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  category TEXT NOT NULL,
  vendor_name TEXT,
  amount_cents INTEGER NOT NULL,
  expense_date TEXT NOT NULL,
  notes TEXT
);
`;

const refunds = `
CREATE TABLE IF NOT EXISTS pos_refunds (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES pos_sale_invoices(id),
  amount_cents INTEGER NOT NULL,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  method TEXT NOT NULL,
  refunded_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'posted'
);

CREATE TABLE IF NOT EXISTS pos_refund_items (
  id TEXT PRIMARY KEY,
  refund_id TEXT NOT NULL REFERENCES pos_refunds(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  qty REAL NOT NULL,
  amount_cents INTEGER NOT NULL
);
`;

const purchaseOrders = `
CREATE TABLE IF NOT EXISTS inv_purchase_orders (
  id TEXT PRIMARY KEY,
  po_no TEXT UNIQUE NOT NULL,
  supplier TEXT NOT NULL,
  expected TEXT NOT NULL,
  lines_count INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Draft',
  created_at TEXT NOT NULL
);
`;

const tips = `
ALTER TABLE pos_payments ADD COLUMN tip_cents INTEGER NOT NULL DEFAULT 0;
`;

const purchaseReceipts = `
ALTER TABLE inv_purchase_orders ADD COLUMN lines_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE inv_purchase_orders ADD COLUMN grn_no TEXT;
ALTER TABLE inv_grns ADD COLUMN po_no TEXT;
`;

const vendorBills = `
ALTER TABLE acc_vendor_bills ADD COLUMN created_at TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_acc_vendor_bills_status ON acc_vendor_bills(status);
`;

const billPayments = `
CREATE TABLE IF NOT EXISTS acc_bill_payments (
  id TEXT PRIMARY KEY,
  bill_id TEXT NOT NULL REFERENCES acc_vendor_bills(id),
  entry_no TEXT NOT NULL DEFAULT '',
  amount_cents INTEGER NOT NULL,
  method TEXT NOT NULL,
  paid_at TEXT NOT NULL
);
`;

const bankStatements = `
CREATE TABLE IF NOT EXISTS acc_bank_lines (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  statement_date TEXT NOT NULL,
  description TEXT NOT NULL,
  reference TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  suggestion TEXT NOT NULL DEFAULT '',
  matched INTEGER NOT NULL DEFAULT 0,
  matched_entry_no TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_acc_bank_lines_matched ON acc_bank_lines(matched, statement_date);
`;

const expenseCoding = `
ALTER TABLE acc_expenses ADD COLUMN account_code TEXT NOT NULL DEFAULT '5300';
ALTER TABLE acc_expenses ADD COLUMN method TEXT NOT NULL DEFAULT 'Bank';
ALTER TABLE acc_expenses ADD COLUMN status TEXT NOT NULL DEFAULT 'Paid';
ALTER TABLE acc_expenses ADD COLUMN entry_no TEXT;
ALTER TABLE acc_expenses ADD COLUMN created_at TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_acc_expenses_date ON acc_expenses(expense_date DESC);
`;

const gstOpening = `
INSERT OR IGNORE INTO sync_terminal_config (key, value) VALUES
  ('gst_collected_cents', '741280'),
  ('gst_paid_cents', '527250');
`;

const journalStatus = `
ALTER TABLE acc_journal_entries ADD COLUMN status TEXT NOT NULL DEFAULT 'Posted';
`;

export const migrations: Migration[] = [
  { id: 1, name: "001_sync", sql: sync },
  { id: 2, name: "002_sale_pos", sql: sale },
  { id: 3, name: "003_inventory", sql: inventory },
  { id: 4, name: "004_accounting", sql: accounting },
  { id: 5, name: "005_refunds", sql: refunds },
  { id: 6, name: "006_tips", sql: tips },
  { id: 7, name: "007_purchase_orders", sql: purchaseOrders },
  { id: 8, name: "008_purchase_receipts", sql: purchaseReceipts },
  { id: 9, name: "009_vendor_bills", sql: vendorBills },
  { id: 10, name: "010_bill_payments", sql: billPayments },
  { id: 11, name: "011_bank_statements", sql: bankStatements },
  { id: 12, name: "012_expense_coding", sql: expenseCoding },
  { id: 13, name: "013_gst_opening", sql: gstOpening },
  { id: 14, name: "014_journal_status", sql: journalStatus },
];
