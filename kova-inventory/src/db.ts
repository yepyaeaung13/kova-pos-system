import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

export interface DatabaseSchema {
  inv_items: {
    id: string;
    sku: string;
    name: string;
    category: string;
    unit: string;
    reorder_level: number;
    cost_cents: number;
    is_active: number;
    updated_at?: Date;
  };
  inv_stock_balances: {
    branch_id: string;
    item_id: string;
    qty_on_hand: number;
    updated_at?: Date;
  };
  inv_stock_ledger: {
    id: string;
    branch_id: string;
    item_id: string;
    delta_qty: number;
    ref_type: string;
    ref_id: string;
    created_at?: Date;
  };
  inv_recipes: {
    id: string;
    product_id: string;
    product_name: string;
    updated_at?: Date;
  };
  inv_recipe_lines: {
    id: string;
    recipe_id: string;
    item_id: string;
    qty_required: number;
  };
  inv_suppliers: {
    id: string;
    name: string;
    contact_name: string | null;
    phone: string | null;
    ntn_tax_id: string | null;
    payment_terms: string;
    updated_at?: Date;
  };
  inv_grns: {
    id: string;
    grn_no: string;
    branch_id: string;
    supplier_id: string;
    supplier_invoice_no: string;
    received_date: Date;
    subtotal_cents: number;
    tax_cents: number;
    total_cents: number;
    payment_status: string;
    created_at?: Date;
  };
  inv_grn_items: {
    id: string;
    grn_id: string;
    item_id: string;
    qty_received: number;
    unit_cost_cents: number;
    line_total_cents: number;
  };
  inv_adjustments: {
    id: string;
    adj_no: string;
    branch_id: string;
    item_id: string;
    reason: string;
    delta_qty: number;
    notes: string | null;
    created_at?: Date;
  };
  processed_mutations: {
    idempotency_key: string;
    entity_type: string;
    entity_id: string;
    result_status: string;
    processed_at?: Date;
  };
  processed_events: {
    event_id: string;
    subject: string;
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
