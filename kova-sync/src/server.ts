import Fastify from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { pushRoutes } from './routes/push.js';
import { pullRoutes } from './routes/pull.js';
import { healthRoutes } from './routes/health.js';

const app = Fastify({ logger: true }).withTypeProvider<TypeBoxTypeProvider>();

app.register(healthRoutes);
app.register(pushRoutes, { prefix: '/api/v1/sync' });
app.register(pullRoutes, { prefix: '/api/v1/sync' });

const PORT = Number(process.env.PORT ?? 8082);

app.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`kova-sync listening on :${PORT}`);
});

process.on('unhandledRejection', (err) => {
  console.error(err);
  process.exit(1);
});
