import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

export interface DatabaseSchema {
  acc_accounts: {
    id: string;
    code: string;
    name: string;
    type: string;
    balance_cents: number;
    updated_at?: Date;
  };
  acc_journal_entries: {
    id: string;
    entry_no: string;
    branch_id: string;
    source_type: string;
    source_id: string | null;
    memo: string;
    posted_at?: Date;
  };
  acc_journal_lines: {
    id: string;
    entry_id: string;
    account_id: string;
    debit_cents: number;
    credit_cents: number;
  };
  acc_vendor_bills: {
    id: string;
    bill_no: string;
    grn_id: string | null;
    supplier_id: string;
    due_date: Date | null;
    total_cents: number;
    paid_cents: number;
    status: string;
  };
  acc_expenses: {
    id: string;
    branch_id: string;
    category: string;
    vendor_name: string | null;
    amount_cents: number;
    expense_date: Date | null;
    notes: string | null;
  };
  processed_events: {
    event_id: string;
    subject: string;
    processed_at?: Date;
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
