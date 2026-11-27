import type { Transaction } from 'kysely';
import type { DatabaseSchema } from './db.js';

export interface JournalLineInput {
  accountCode: string;
  debitCents: number;
  creditCents: number;
}

export async function postJournal(
  trx: Transaction<DatabaseSchema>,
  branchId: string,
  sourceType: string,
  sourceId: string,
  memo: string,
  lines: JournalLineInput[]
) {
  const entryId = crypto.randomUUID();
  const entryNo = `JE-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

  await trx
    .insertInto('acc_journal_entries')
    .values({
      id: entryId,
      entry_no: entryNo,
      branch_id: branchId,
      source_type: sourceType,
      source_id: sourceId,
      memo,
    })
    .execute();

  for (const line of lines) {
    const account = await trx
      .selectFrom('acc_accounts')
      .select('id')
      .where('code', '=', line.accountCode)
      .executeTakeFirst();

    if (!account) {
      throw new Error(`Unknown account code: ${line.accountCode}`);
    }

    await trx
      .insertInto('acc_journal_lines')
      .values({
        id: crypto.randomUUID(),
        entry_id: entryId,
        account_id: account.id,
        debit_cents: line.debitCents,
        credit_cents: line.creditCents,
      })
      .execute();
  }
}
