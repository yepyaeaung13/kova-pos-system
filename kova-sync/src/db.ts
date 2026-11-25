import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

export interface DatabaseSchema {
  processed_mutations: {
    idempotency_key: string;
    tenant_id: string;
    branch_id: string;
    entity_type: string;
    entity_id: string;
    result_status: string;
    server_seq: number | null;
    processed_at?: Date;
  };
  branch_changelog: {
    seq?: number;
    tenant_id: string;
    branch_id: string;
    service_name: 'sale' | 'inventory' | 'accounting';
    entity_type: string;
    entity_id: string;
    operation: 'UPSERT' | 'DELETE';
    data: Record<string, unknown>;
    created_at?: Date;
  };
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = new Kysely<DatabaseSchema>({
  dialect: new PostgresDialect({ pool }),
});

export async function closePool() {
  await pool.end();
}
