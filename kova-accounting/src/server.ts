import Fastify from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { connect, StringCodec, AckPolicy } from 'nats';
import { Transaction } from 'kysely';
import type { DatabaseSchema } from './db.js';
import { db } from './db.js';
import { validateSaleCompletedEvent, SUBJECTS } from '@kova/contracts';

const app = Fastify({ logger: true }).withTypeProvider<TypeBoxTypeProvider>();

const NATS_URL = process.env.NATS_URL ?? 'nats://localhost:4222';
const sc = StringCodec();

const PORT = Number(process.env.PORT ?? 8085);

async function postJournal(
  trx: Transaction<DatabaseSchema>,
  branchId: string,
  sourceType: string,
  sourceId: string,
  memo: string,
  lines: Array<{ accountCode: string; debitCents: number; creditCents: number }>
) {
  const entryId = crypto.randomUUID();
  const entryNo = `JE-${Date.now()}`;

  await trx.insertInto('acc_journal_entries').values({
    id: entryId,
    entry_no: entryNo,
    branch_id: branchId,
    source_type: sourceType,
    source_id: sourceId,
    memo,
  });

  for (const l of lines) {
    await trx.insertInto('acc_journal_lines').values({
      id: crypto.randomUUID(),
      entry_id: entryId,
      account_id: (
        await trx.selectFrom('acc_accounts').select('id').where('code', '=', l.accountCode).executeTakeFirst()
      )!.id,
      debit_cents: l.debitCents,
      credit_cents: l.creditCents,
    });
  }
}

async function handleSaleCompletedJournal(
  trx: Transaction<DatabaseSchema>,
  evt: { eventId: string; subject: string; branchId: string; data: any }
) {
  const netRevenueCents = evt.data.subtotalCents - evt.data.discountCents;
  const clearingAccount = evt.data.paymentMethod === 'Cash' ? '1010' : '1020';

  const lines = [
    { accountCode: clearingAccount, debitCents: evt.data.grandTotalCents, creditCents: 0 },
    { accountCode: '4000', debitCents: 0, creditCents: netRevenueCents },
    { accountCode: '2100', debitCents: 0, creditCents: evt.data.gstCents },
  ];

  const debitSum = lines.reduce((s, l) => s + l.debitCents, 0);
  const creditSum = lines.reduce((s, l) => s + l.creditCents, 0);
  if (debitSum !== creditSum) {
    throw new Error(`Unbalanced journal for ${evt.data.docNo}: ${debitSum} !== ${creditSum}`);
  }

  await postJournal(trx, evt.branchId, evt.data.sourceType, evt.data.sourceId, `Sale ${evt.data.docNo}`, lines);
}

async function handleGrnReceivedJournal(
  trx: Transaction<DatabaseSchema>,
  evt: { eventId: string; subject: string; branchId: string; data: any }
) {
  await postJournal(trx, evt.branchId, 'grn', evt.data.grnId, `GRN ${evt.data.grnNo}`, [
    { accountCode: '1300', debitCents: evt.data.subtotalCents, creditCents: 0 },
    { accountCode: '2110', debitCents: evt.data.taxCents, creditCents: 0 },
    { accountCode: '2000', debitCents: 0, creditCents: evt.data.totalCents },
  ]);

  await trx.insertInto('acc_vendor_bills').values({
    id: crypto.randomUUID(),
    bill_no: evt.data.supplierInvoiceNo,
    grn_id: evt.data.grnId,
    supplier_id: evt.data.supplierId,
    due_date: evt.data.dueDate ?? null,
    total_cents: evt.data.totalCents,
    paid_cents: 0,
    status: 'Open',
  });
}

async function start() {
  await app.listen({ port: PORT, host: '0.0.0.0' });
  app.log.info(`kova-accounting listening on :${PORT}`);

  const nc = await connect({ servers: NATS_URL });
  const js = nc.jetstream();
  app.log.info('Connected to NATS JetStream');

  const consumer = await js.consumers.get('KOVA_EVENTS', 'acc-gl-poster');
  const messages = await consumer.consume();

  (async () => {
    for await (const msg of messages) {
      const raw = JSON.parse(sc.decode(msg.data));
      if (!validateSaleCompletedEvent.Check(raw)) {
        msg.term('Invalid event schema');
        continue;
      }

      const evt = raw;
      try {
        if (msg.subject === SUBJECTS.SALE_COMPLETED) {
          const seen = await db
            .selectFrom('processed_events')
            .select('event_id')
            .where('event_id', '=', evt.eventId)
            .executeTakeFirst();

          if (seen) {
            msg.ack();
            continue;
          }

          await db.transaction().execute(async (trx) => {
            await handleSaleCompletedJournal(trx, evt);
            await trx.insertInto('processed_events').values({
              event_id: evt.eventId,
              subject: evt.subject,
            });
          });
        }
        msg.ack();
      } catch {
        msg.nak(5000);
      }
    }
  })();
}

start().catch((err) => {
  app.log.error(err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error(err);
  process.exit(1);
});
