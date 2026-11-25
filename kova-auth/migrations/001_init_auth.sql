CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  gst_bps INTEGER NOT NULL DEFAULT 1600,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  code TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS terminals (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  branch_id TEXT NOT NULL REFERENCES branches(id),
  device_id TEXT NOT NULL UNIQUE,
  doc_prefix TEXT NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  branch_id TEXT NOT NULL REFERENCES branches(id),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY,
  family_id UUID NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  terminal_id TEXT NOT NULL REFERENCES terminals(id),
  token_hash TEXT NOT NULL UNIQUE,
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL
);
