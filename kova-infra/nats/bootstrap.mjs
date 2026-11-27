import {
  connect,
  AckPolicy,
  DeliverPolicy,
  ReplayPolicy,
  RetentionPolicy,
  StorageType,
} from 'nats';

const NATS_URL = process.env.NATS_URL ?? 'nats://nats:4222';
const DAY = 24 * 60 * 60 * 1_000_000_000;

const nc = await connect({ servers: NATS_URL });
const jsm = await nc.jetstream().jetstreamManager();

async function ensureStream(config) {
  try {
    await jsm.streams.add(config);
    console.log(`created stream ${config.name}`);
  } catch (err) {
    if (/already in use|stream name already in use/i.test(String(err))) {
      console.log(`stream ${config.name} already exists`);
      return;
    }
    throw err;
  }
}

async function ensureConsumer(stream, config) {
  try {
    await jsm.consumers.add(stream, config);
    console.log(`created consumer ${config.durable_name}`);
  } catch (err) {
    if (/already exists|consumer already exists/i.test(String(err))) {
      console.log(`consumer ${config.durable_name} already exists`);
      return;
    }
    throw err;
  }
}

await ensureStream({
  name: 'KOVA_EVENTS',
  subjects: ['kova.>'],
  retention: RetentionPolicy.Limits,
  storage: StorageType.File,
  max_age: 30 * DAY,
  duplicate_window: 2 * 60 * 1_000_000_000,
});

await ensureStream({
  name: 'KOVA_DLQ',
  subjects: ['dlq.>'],
  retention: RetentionPolicy.Limits,
  storage: StorageType.File,
  max_age: 90 * DAY,
});

await ensureConsumer('KOVA_EVENTS', {
  durable_name: 'inv-sale-depletion',
  filter_subject: 'kova.sale.completed',
  ack_policy: AckPolicy.Explicit,
  deliver_policy: DeliverPolicy.All,
  replay_policy: ReplayPolicy.Instant,
  ack_wait: 30 * 1_000_000_000,
  max_deliver: 5,
});

await ensureConsumer('KOVA_EVENTS', {
  durable_name: 'acc-gl-poster',
  filter_subject: 'kova.>',
  ack_policy: AckPolicy.Explicit,
  deliver_policy: DeliverPolicy.All,
  replay_policy: ReplayPolicy.Instant,
  ack_wait: 30 * 1_000_000_000,
  max_deliver: 5,
});

nc.close();
