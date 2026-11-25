CREATE TABLE IF NOT EXISTS processed_mutations (
  idempotency_key TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  result_status TEXT NOT NULL,
  server_seq BIGINT,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS branch_changelog (
  seq BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_changelog_tenant_branch_seq
  ON branch_changelog (tenant_id, branch_id, seq);
