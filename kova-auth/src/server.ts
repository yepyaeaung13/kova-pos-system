import Fastify from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { loginRoutes } from './routes/login.js';
import { healthRoutes } from './routes/health.js';

const app = Fastify({ logger: true }).withTypeProvider<TypeBoxTypeProvider>();

app.register(healthRoutes);
app.register(loginRoutes, { prefix: '/api/v1/auth' });

const PORT = Number(process.env.PORT ?? 8081);

app.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`kova-auth listening on :${PORT}`);
});

process.on('unhandledRejection', (err: unknown) => {
  console.error(err);
  process.exit(1);
});
