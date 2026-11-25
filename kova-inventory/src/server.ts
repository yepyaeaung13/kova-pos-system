import Fastify from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { connect, StringCodec, AckPolicy } from 'nats';
import { sql } from 'kysely';
import { db } from './db.js';
import { validateSaleCompletedEvent, SUBJECTS } from '@kova/contracts';
import { internalSyncRoutes } from './routes/internalSync.js';

const app = Fastify({ logger: true }).withTypeProvider<TypeBoxTypeProvider>();

const NATS_URL = process.env.NATS_URL ?? 'nats://localhost:4222';
const sc = StringCodec();

app.register(internalSyncRoutes, { prefix: '' });

const PORT = Number(process.env.PORT ?? 8084);

async function start() {
  await app.listen({ port: PORT, host: '0.0.0.0' });
  app.log.info(`kova-inventory listening on :${PORT}`);

  const nc = await connect({ servers: NATS_URL });
  const js = nc.jetstream();
  app.log.info('Connected to NATS JetStream');

  const consumer = await js.consumers.get('KOVA_EVENTS', 'inv-sale-depletion');
  const messages = await consumer.consume();

  (async () => {
    for await (const msg of messages) {
      const raw = JSON.parse(sc.decode(msg.data));
      if (!validateSaleCompletedEvent.Check(raw)) {
        msg.term('Invalid SaleCompletedEvent schema');
        continue;
      }

      const evt = raw;
      try {
        const seen = await db
          .selectFrom('processed_events')
          .select('event_id')
          .where('event_id', '=', evt.eventId)
          .executeTakeFirst();

        if (seen) {
          msg.ack();
          continue;
        }

        for (const item of evt.data.items ?? []) {
          const recipe = await db
            .selectFrom('inv_recipes as r')
            .innerJoin('inv_recipe_lines as rl', 'rl.recipe_id', 'r.id')
            .select(['rl.item_id', 'rl.qty_required'])
            .where('r.product_id', '=', item.productId)
            .execute();

          for (const r of recipe) {
            const delta = -(Number(r.qty_required) * Number(item.qty));
            await db.insertInto('inv_stock_ledger').values({
              id: crypto.randomUUID(),
              branch_id: evt.branchId,
              item_id: r.item_id,
              delta_qty: delta,
              ref_type: 'sale_bom',
              ref_id: evt.data.sourceId,
            });

            await db
              .insertInto('inv_stock_balances')
              .values({
                branch_id: evt.branchId,
                item_id: r.item_id,
                qty_on_hand: delta,
              })
              .onConflict((oc) =>
                oc.columns(['branch_id', 'item_id']).doUpdateSet({
                  qty_on_hand: sql`inv_stock_balances.qty_on_hand + ${delta}`,
                  updated_at: new Date(),
                })
              );
          }
        }

        await db.insertInto('processed_events').values({
          event_id: evt.eventId,
          subject: SUBJECTS.SALE_COMPLETED,
        });

        msg.ack();
      } catch {
        msg.nak(2000);
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
