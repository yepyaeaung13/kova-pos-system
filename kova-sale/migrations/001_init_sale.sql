CREATE TABLE IF NOT EXISTS sale_invoices (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  doc_no TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  subtotal_cents INTEGER NOT NULL,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  gst_cents INTEGER NOT NULL,
  grand_total_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sale_invoice_items (
  id BIGSERIAL PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES sale_invoices(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  qty NUMERIC(10, 3) NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  line_total_cents INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS processed_mutations (
  idempotency_key TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
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
