import { StringCodec, type JetStreamClient } from 'nats';
import { db } from './db.js';

const sc = StringCodec();

export async function flushServiceOutbox(js: JetStreamClient) {
  const rows = await db
    .selectFrom('service_outbox')
    .select(['id', 'event_id', 'subject', 'payload'])
    .where('published_at', 'is', null)
    .orderBy('id', 'asc')
    .limit(25)
    .execute();

  for (const row of rows) {
    await js.publish(row.subject, sc.encode(JSON.stringify(row.payload)), {
      msgID: row.event_id,
    });
    await db
      .updateTable('service_outbox')
      .set({ published_at: new Date() })
      .where('id', '=', typeof row.id === 'number' ? row.id : Number(row.id))
      .execute();
  }
}
