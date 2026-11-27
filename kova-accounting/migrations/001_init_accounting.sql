CREATE TABLE IF NOT EXISTS acc_accounts (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  balance_cents INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS acc_journal_entries (
  id TEXT PRIMARY KEY,
  entry_no TEXT UNIQUE NOT NULL,
  branch_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT,
  memo TEXT NOT NULL,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  due_date TIMESTAMPTZ,
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
  expense_date TIMESTAMPTZ NOT NULL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS processed_events (
  event_id UUID PRIMARY KEY,
  subject TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS processed_mutations (
  idempotency_key TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  result_status TEXT NOT NULL DEFAULT 'acked',
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
