import Fastify from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { connect } from 'nats';
import { flushServiceOutbox } from './outboxPublisher.js';
import { invoicesRoutes } from './routes/invoices.js';
import { internalSyncRoutes } from './routes/internalSync.js';
import { healthRoutes } from './routes/health.js';

const app = Fastify({ logger: true }).withTypeProvider<TypeBoxTypeProvider>();

const NATS_URL = process.env.NATS_URL ?? 'nats://localhost:4222';

app.register(healthRoutes);
app.register(invoicesRoutes);
app.register(internalSyncRoutes);

const PORT = Number(process.env.PORT ?? 8083);

async function start() {
  await app.listen({ port: PORT, host: '0.0.0.0' });
  app.log.info(`kova-sale listening on :${PORT}`);

  const nc = await connect({ servers: NATS_URL });
  const js = nc.jetstream();
  app.log.info('Connected to NATS JetStream');

  const flush = () => {
    void flushServiceOutbox(js).catch((err) => app.log.error(err));
  };
  flush();
  setInterval(flush, 500);
}

start().catch((err) => {
  app.log.error(err);
  process.exit(1);
});

process.on('unhandledRejection', (err: unknown) => {
  console.error(err);
  process.exit(1);
});
