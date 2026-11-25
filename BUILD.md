# Kova ERP — Build Instructions

## Workspace Layout

```
kova-app/              (this root — nsh.dev client, already scaffolded)
kova-contracts/        @kova/contracts — TypeBox schemas + integer-cents math
kova-auth/             Fastify + Postgres — auth, JWT, PIN (port 8081)
kova-sync/             Fastify + Postgres — /sync/push & /sync/pull (port 8082)
kova-sale/             Fastify + Postgres + NATS — POS & invoices (port 8083)
kova-inventory/        Fastify + Postgres + NATS — stock & BOM (port 8084)
kova-accounting/       Fastify + Postgres + NATS — double-entry GL (port 8085)
kova-infra/            Docker Compose, Envoy, NATS, K8s (gateway port 8080)
```

## 1. Install dependencies

```bash
npm run setup
```

## 2. Start the dev stack

```bash
npm run infra:up
```

This boots Postgres (5 databases), NATS JetStream, Envoy gateway on :8080, and prebuilt service containers.

## 3. Bootstrap NATS JetStream

```bash
bash kova-infra/nats/init-jetstream.sh
```

Creates the `KOVA_EVENTS` stream, `KOVA_DLQ` dead-letter stream, and durable consumers `inv-sale-depletion` and `acc-gl-poster`.

## 4. Run database migrations

Each service has `migrations/001_init_*.sql`. Apply them to the corresponding database:

```bash
# kova-auth -> kova_auth
psql "$DATABASE_URL_AUTH" -f kova-auth/migrations/001_init_auth.sql

# kova-sync -> kova_sync
psql "$DATABASE_URL_SYNC" -f kova-sync/migrations/001_init_sync.sql

# kova-sale -> kova_sale
psql "$DATABASE_URL_SALE" -f kova-sale/migrations/001_init_sale.sql

# kova-inventory -> kova_inventory
psql "$DATABASE_URL_INVENTORY" -f kova-inventory/migrations/001_init_inventory.sql

# kova-accounting -> kova_accounting
psql "$DATABASE_URL_ACCOUNTING" -f kova-accounting/migrations/001_init_accounting.sql
```

## 5. Build all services

```bash
npm run build:all
```

## 6. Typecheck

```bash
npm run typecheck:all
```

## 7. Develop one service locally

Stop its container and run it with `npm run dev`:

```bash
cd kova-infra && docker compose stop kova-sale
cd ../kova-sale && npm run dev   # binds :8083, overrides container
```

## Architecture Rules (non-negotiable)

- **Polyrepo** — 8 independent repos, no monorepo merge
- **TypeBox only** — no Zod
- **Integer-cents** — no floating-point money; use `@kova/contracts` math helpers
- **Offline-first** — local SQLite WAL + outbox; sync when online
- **Quiet Paper UI** — `#FBF9F5` / `#1E1D1B` / `#C85A32` / `#3B7A57`
