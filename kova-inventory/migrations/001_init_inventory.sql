CREATE TABLE IF NOT EXISTS inv_items (
  id TEXT PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  reorder_level REAL NOT NULL DEFAULT 0,
  cost_cents INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inv_stock_balances (
  branch_id TEXT NOT NULL,
  item_id TEXT NOT NULL REFERENCES inv_items(id),
  qty_on_hand REAL NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (branch_id, item_id)
);

CREATE TABLE IF NOT EXISTS inv_stock_ledger (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  item_id TEXT NOT NULL REFERENCES inv_items(id),
  delta_qty REAL NOT NULL,
  ref_type TEXT NOT NULL,
  ref_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inv_recipes (
  id TEXT PRIMARY KEY,
  product_id TEXT UNIQUE NOT NULL,
  product_name TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inv_recipe_lines (
  id TEXT PRIMARY KEY,
  recipe_id TEXT NOT NULL REFERENCES inv_recipes(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES inv_items(id),
  qty_required REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS inv_suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  ntn_tax_id TEXT,
  payment_terms TEXT DEFAULT 'Net 15',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inv_grns (
  id TEXT PRIMARY KEY,
  grn_no TEXT UNIQUE NOT NULL,
  branch_id TEXT NOT NULL,
  supplier_id TEXT NOT NULL REFERENCES inv_suppliers(id),
  supplier_invoice_no TEXT NOT NULL,
  received_date TIMESTAMPTZ NOT NULL,
  subtotal_cents INTEGER NOT NULL,
  tax_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'Unpaid',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS processed_mutations (
  idempotency_key TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  result_status TEXT NOT NULL DEFAULT 'acked',
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS processed_events (
  event_id UUID PRIMARY KEY,
  subject TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_outbox (
  id BIGSERIAL PRIMARY KEY,
  event_id UUID NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
