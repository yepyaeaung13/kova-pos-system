import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

export interface DatabaseSchema {
  sale_invoices: {
    id: string;
    tenant_id: string;
    branch_id: string;
    doc_no: string;
    payment_method: string;
    payment_status: string;
    subtotal_cents: number;
    discount_cents: number;
    gst_cents: number;
    grand_total_cents: number;
    created_at?: Date;
  };
  sale_invoice_items: {
    id?: number;
    invoice_id: string;
    product_id: string;
    qty: number;
    unit_price_cents: number;
    line_total_cents: number;
  };
  processed_mutations: {
    idempotency_key: string;
    entity_type: string;
    entity_id: string;
    processed_at?: Date;
  };
  service_outbox: {
    id?: number;
    event_id: string;
    subject: string;
    branch_id: string;
    payload: Record<string, unknown>;
    published_at: Date | null;
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
