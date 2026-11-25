#!/usr/bin/env bash
set -euo pipefail

NATS_URL="${NATS_URL:-nats://nats:4222}"

echo "Bootstrapping NATS JetStream streams and durable consumers..."

# 1. Primary domain event stream (2-minute msgID deduplication window)
nats stream add KOVA_EVENTS \
  --server="$NATS_URL" \
  --subjects="kova.>" \
  --storage=file \
  --retention=limits \
  --max-age=30d \
  --dupe-window=2m \
  --defaults || echo "KOVA_EVENTS stream already exists"

# 2. Dead-letter stream for poisoned/invalid TypeBox payloads
nats stream add KOVA_DLQ \
  --server="$NATS_URL" \
  --subjects="dlq.>" \
  --storage=file \
  --retention=limits \
  --max-age=90d \
  --defaults || echo "KOVA_DLQ stream already exists"

# 3. Durable consumers for Inventory & Accounting
nats consumer add KOVA_EVENTS inv-sale-depletion \
  --server="$NATS_URL" \
  --filter="kova.sale.completed" \
  --ack=explicit --wait=30s --max-deliver=5 --deliver=all --pull --defaults \
  || echo "inv-sale-depletion consumer already exists"

nats consumer add KOVA_EVENTS acc-gl-poster \
  --server="$NATS_URL" \
  --filter="kova.>" \
  --ack=explicit --wait=30s --max-deliver=5 --deliver=all --pull --defaults \
  || echo "acc-gl-poster consumer already exists"

echo "NATS JetStream bootstrap complete."
