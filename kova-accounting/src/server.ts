import Fastify from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { connect, StringCodec } from 'nats';
import type { Transaction } from 'kysely';
import type { DatabaseSchema } from './db.js';
import { db } from './db.js';
import {
  SUBJECTS,
  validateSaleCompletedEvent,
  validateGrnReceivedEvent,
  validateStockAdjustedEvent,
} from '@kova/contracts';
import { postJournal } from './journal.js';
import { healthRoutes } from './routes/health.js';
import { internalSyncRoutes } from './routes/internalSync.js';

const app = Fastify({ logger: true }).withTypeProvider<TypeBoxTypeProvider>();

const NATS_URL = process.env.NATS_URL ?? 'nats://localhost:4222';
const sc = StringCodec();

const PORT = Number(process.env.PORT ?? 8085);

app.register(healthRoutes);
app.register(internalSyncRoutes);

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

  const debitSum = lines.reduce((sum, line) => sum + line.debitCents, 0);
  const creditSum = lines.reduce((sum, line) => sum + line.creditCents, 0);
  if (debitSum !== creditSum) {
    throw new Error(`Unbalanced journal for ${evt.data.docNo}: ${debitSum} !== ${creditSum}`);
  }

  await postJournal(trx, evt.branchId, 'sale', evt.data.sourceId, `Sale ${evt.data.docNo}`, lines);
}

async function handleGrnReceivedJournal(
  trx: Transaction<DatabaseSchema>,
  evt: { eventId: string; subject: string; branchId: string; data: any }
) {
  const { subtotalCents, taxCents, totalCents } = evt.data;
  if (subtotalCents + taxCents !== totalCents) {
    throw new Error(`Unbalanced GRN journal for ${evt.data.grnNo}: ${subtotalCents} + ${taxCents} !== ${totalCents}`);
  }

  await postJournal(trx, evt.branchId, 'grn', evt.data.grnId, `GRN ${evt.data.grnNo}`, [
    { accountCode: '1300', debitCents: subtotalCents, creditCents: 0 },
    { accountCode: '2110', debitCents: taxCents, creditCents: 0 },
    { accountCode: '2000', debitCents: 0, creditCents: totalCents },
  ]);

  await trx
    .insertInto('acc_vendor_bills')
    .values({
      id: crypto.randomUUID(),
      bill_no: evt.data.supplierInvoiceNo,
      grn_id: evt.data.grnId,
      supplier_id: evt.data.supplierId,
      due_date: evt.data.dueDate ? new Date(evt.data.dueDate) : null,
      total_cents: totalCents,
      paid_cents: 0,
      status: 'Open',
    })
    .execute();
}

function isValidEvent(subject: string, raw: unknown): boolean {
  switch (subject) {
    case SUBJECTS.SALE_COMPLETED:
      return validateSaleCompletedEvent.Check(raw);
    case SUBJECTS.INVENTORY_GRN_RECEIVED:
      return validateGrnReceivedEvent.Check(raw);
    case SUBJECTS.INVENTORY_STOCK_ADJUSTED:
      return validateStockAdjustedEvent.Check(raw);
    default:
      return false;
  }
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
      let raw: unknown;
      try {
        raw = JSON.parse(sc.decode(msg.data));
      } catch {
        void msg.term('Invalid JSON payload');
        continue;
      }

      if (!isValidEvent(msg.subject, raw)) {
        void msg.term('Invalid event schema');
        continue;
      }

      const evt = raw as { eventId: string; subject: string; branchId: string; data: any };
      try {
        if (msg.subject !== SUBJECTS.SALE_COMPLETED && msg.subject !== SUBJECTS.INVENTORY_GRN_RECEIVED) {
          msg.ack();
          continue;
        }

        await db.transaction().execute(async (trx) => {
          const seen = await trx
            .selectFrom('processed_events')
            .select('event_id')
            .where('event_id', '=', evt.eventId)
            .executeTakeFirst();

          if (seen) {
            return;
          }

          if (msg.subject === SUBJECTS.SALE_COMPLETED) {
            await handleSaleCompletedJournal(trx, evt);
          } else {
            await handleGrnReceivedJournal(trx, evt);
          }

          await trx
            .insertInto('processed_events')
            .values({
              event_id: evt.eventId,
              subject: msg.subject,
            })
            .execute();
        });

        msg.ack();
      } catch (err) {
        app.log.error(err);
        msg.nak(5000);
      }
    }
  })();
}

start().catch((err) => {
  app.log.error(err);
  process.exit(1);
});

process.on('unhandledRejection', (err: unknown) => {
  console.error(err);
  process.exit(1);
});
