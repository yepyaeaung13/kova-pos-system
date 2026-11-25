import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';

export interface DatabaseSchema {
  tenants: {
    id: string;
    name: string;
    gst_bps: number;
    created_at?: Date;
  };
  branches: {
    id: string;
    tenant_id: string;
    name: string;
    code: string;
  };
  terminals: {
    id: string;
    tenant_id: string;
    branch_id: string;
    device_id: string;
    doc_prefix: string;
    last_seen_at?: Date;
  };
  users: {
    id: string;
    tenant_id: string;
    branch_id: string;
    email: string;
    full_name: string;
    role: string;
    password_hash: string;
    pin_hash: string;
    active: boolean;
  };
  refresh_tokens: {
    id: string;
    family_id: string;
    user_id: string;
    terminal_id: string;
    token_hash: string;
    revoked_at: Date | null;
    expires_at: Date;
  };
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = new Kysely<DatabaseSchema>({
  dialect: new PostgresDialect({ pool }),
});

export { sql };

export async function closePool() {
  await pool.end();
}
