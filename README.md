# Kova ERP — desktop

The desktop build of the Kova ERP / POS design export, written in TSX for
[Native Shell](https://nsh.dev). Mobile screens are intentionally out of scope.

```
nsh dev                 # native Windows window, hot reload
nsh run --target web    # browser preview (downloads the web runtime once)
nsh test                # headless smoke test of every screen
nsh check               # type check
```

Run from this directory. `nsh` lives at `%LOCALAPPDATA%\nsh\bin\nsh.exe`.

## What is in here

- **POS** — register (modifier sheets, editable lines, customer/loyalty picker,
  held tickets, ticket splitting, percent/amount discounts), a dine-in floor
  plan (Table 1–10 + bar, seat / request bill / clear), checkout with tips,
  multi-tender split payments, product editor, A4 invoice, 80mm receipt preview, manual
  **New sale** invoice entry, dashboard, kitchen board with ticket drawers,
  sales with invoice drawers, refunds & voids behind a manager PIN, products,
  customers & loyalty,
  reports/shift close, settings, SQLite outbox, and a full-window sign-in
  screen.
- **Inventory** — stock overview, stock items with a per-item drawer (ledger,
  par/cost editing), add item, recipes & BOM, goods received (form + history),
  purchase orders, adjustments (posted to SQLite, balance + ledger + outbox),
  branch transfers, suppliers & audits.
- **Accounting** — overview, chart of accounts, general journal, expenses,
  vendor payables, bank reconciliation, P&L and tax.

The app is one window: a 212pt nav rail with a POS / INV / ACC switcher, a
workspace header (search, sync state, branch, outbox), and the current screen.
Every screen is mounted only while its route is active.

## Offline SQLite

The register writes to a real SQLite database first, then syncs through an
outbox — the flow in the export's `SQLITE_DDL_SYNC_API_SPEC.md`.

- **File:** `%APPDATA%\dev.kova.erp\kova-pos.db` (WAL, `synchronous=NORMAL`,
  `foreign_keys=ON`, `busy_timeout=5000`, `temp_store=MEMORY`).
- **Driver:** `src/db/sqlite.ts` opens the file through the `sqlite3` shell
  (granted by `capabilities.process.execute`). NSH 0.7 has no in-process SQLite
  binding; every call runs one statement batch in its own connection, which is
  cheap at POS volume. Swapping in a native nshm later only touches this file.
- **Menu edits** go to `pos_products` and are re-hydrated into the register on
  boot, so a renamed item or new price survives a restart. Stock adjustments
  update `inv_stock_balances`, append `inv_stock_ledger`, write
  `inv_adjustments` and queue an inventory mutation in one transaction.
- **Receiving a purchase order** reserves the next GRN number from
  `sync_terminal_config`, then posts the GRN header and its lines, adds each
  received line to the balance and ledger, updates the item cost, queues an
  inventory mutation and stamps the purchase order `Received` with `grn_no` in
  one transaction. The receipt is listed in goods received history.
- **Supplier bills:** the same receipt writes `acc_vendor_bills` (due net 7 days)
  and posts a balanced journal entry — debit inventory and input tax, credit
  accounts payable — sourced to the GRN. Vendor payables and General journal
  hydrate those rows, so a receipt shows up in both.
- **Paying a bill** (Vendor payables → Pay, manager PIN) writes
  `acc_bill_payments`, settles the bill and posts AP → bank in one transaction,
  with the account balances and accounting outbox rows. **Start pay run** selects
  any subset of open bills, approves once behind the PIN and posts one AP → bank
  entry per bill in a single transaction. The first run seeds the design's
  opening supplier bills so they are real, payable rows.
- **Bank reconciliation** reads `acc_bank_lines` (the design's feed is seeded on
  first run) and shows the statement closing against the live `1010` balance.
  Matching or clearing a line persists `matched` / `matched_entry_no` and queues
  an accounting mutation; auto-match applies each line's ledger suggestion.
- **Expenses** are recorded from the drawer, coded to a ledger account and
  posted with the tender credit (bank, cash or card) in one transaction, with
  the account balances and accounting outbox rows. The design's six expenses are
  seeded on first run, and the category mix, totals and journal all read the
  persisted rows.
- **P&L, GST and the chart of accounts** read `acc_accounts`: revenue 4000/4100,
  COGS 5000, operating costs 5100–5400, and net GST from the 2100 balance plus
  its opening position in `sync_terminal_config`. The overview, P&L statement
  and account list follow every posted sale, receipt, payment and expense.
- **The accounting overview** reads the same rows: payables due this week from
  `acc_vendor_bills` (session receipts included), the recent journal from posted
  entries, and the close checklist's bank count from `acc_bank_lines`.
- **Manual journal entries** (General journal → New entry) pick a debit and a
  credit account, check they differ, and post a balanced entry in one
  transaction. Balances move by account type — a debit grows assets/expenses, a
  credit grows liabilities/equity/revenue — and the entry is queued for sync.
- **Schema:** `src/db/schema.ts` holds the spec's migrations — sync
  infrastructure, sale/POS, inventory, accounting — plus a `pos_products` read
  model so the menu works offline. Money is integer cents; ids are client-side
  ULIDs; timestamps are ISO-8601 UTC.
- **Writes:** a completed sale commits the order, its items, the A4 invoice, the
  payment and a balanced journal entry (debit cash/card, credit sales and tax) in
  **one** transaction, together with three `sync_outbox` rows. A split payment
  writes one `pos_payments` row per tender and debits each tender's account. Shift close and
  order status changes append their own outbox rows. Refunds post the refund
  row, reverse the journal (debit sales + tax, credit cash/card), set the
  invoice to `Refunded`/`Partially refunded`, and queue a `refund` mutation;
  voids set the invoice and its order to `Voided`. Tips are stored on the
  payment (`tip_cents`) and credited to payroll payable, never to sales.
- **Worker:** `src/sync/worker.ts` drains up to 50 pending rows every 15s (or on
  **Sync now**), posts them to `POST /api/v1/sync/push`, then pulls
  `GET /api/v1/sync/pull` and advances the per-service cursors. Failures back
  off 5s, 10s, 20s … capped at 5 minutes and 8 attempts; `conflict` results are
  kept in `sync_conflicts` for review.
- **UI:** the header pill shows the real queue (`SQLite · Synced` / `n queued`),
  and the outbox screen lists live rows with attempts, last error, retry and
  discard. Settings has the gateway URL, connection state and database details.

The manager PIN (Settings → Shift & security, default `2468`) gates refunds,
voids and ticket cancellation; it is stored in `sync_terminal_config`.

Point it at the backend with the **Sync gateway** field in Settings (stored in
`sync_terminal_config.gateway_url`, default `http://127.0.0.1:8080`). The worker
sends `Authorization: Bearer …` (`auth_token`, default `demo-token`) plus
`X-Tenant-Id` and `X-Device-Id`. `nsh.json` grants the network host it talks
to — add the real gateway host there when the URL is known.

Held tickets and the floor plan are session-scoped (a parked ticket or a seated
table is not a sale); everything that closes a ticket does write.

The receipt preview renders the last invoice as an 80mm roll; its print action
queues to the configured thermal printer, which this build does not bridge yet.

`nsh test` runs headless with no app data directory, so the database layer
reports unavailable and the app falls back to in-memory state; the desktop run
is where persistence and the outbox are live.

## Design system

Tokens live in `nsh.json` and are mirrored for canvas/SVG use in
`src/tokens.ts`:

| Token | Value |
| --- | --- |
| Primary / container | `#932C10` / `#B44326` |
| Paper / ink | `#FAF9F6` / `#1F1B16` |
| Secondary (success) | `#3F5E27` |
| Tertiary (info) | `#2F5372` |
| Amber (warning) | `#7E5700` |
| Plum (loyalty) | `#75376A` |
| Display / headline | Fraunces SemiBold (bundled) → Georgia fallback |
| Title / body / label | Work Sans (bundled) → Segoe UI fallback |
| Radius | 6 / 10 / 12 / 16 / 24 / full |
| Spacing step | 4pt (`p-4` = 16pt = the design's `lg`) |

Stitch's named scale maps to the numeric steps: `xs→1, sm→2, md→3, lg→4,
xl→6, 2xl→8`.

Fonts are bundled in `assets/fonts` and registered on import (`src/fonts.ts`).
The nsh 0.7 Windows host does not yet resolve imported faces by name in its
text stack, so the theme lists the bundled family first and a system fallback
after it — see `assets/fonts/README.md`. The icon set is the Material Symbols
variable font rendered as ligatures (`src/ui/Icon.tsx`), so
`<Icon name="shopping_cart" />` matches the export.

## Structure

```
App.tsx                  mount(AppShell) + font registration
src/layout/              AppShell, NavRail, TopBar
src/screens/pos/         12 POS screens
src/screens/inventory/   11 inventory screens
src/screens/accounting/  7 accounting screens
src/screens/Router.tsx   app + screen switch
src/db/                  SQLite driver, schema, repository, outbox writes
src/sync/                sync state + push/pull worker
src/ui/                  Button, Field, Table, Charts, Badge, Card, Screen, …
src/data/mock.ts         menu, orders, customers, sales, chart data
src/data/ops.ts          stock, purchasing, suppliers, accounts, journal, tax
src/store.ts             route, cart, totals, kitchen queue, invoices
```

## Data

Everything is local mock data: it makes the screens real enough to review and
wire up. The cart, kitchen queue, drawer count, bank matching and settings
toggles are live signals; completing a sale creates a real invoice snapshot,
posts it into the sales list and clears the register.

Product photography from the export was served from Google's signed AIDA URLs
and is not accessible, so menu artwork is a tinted panel with the item's emoji
(`src/ui/ProductArt.tsx`). Dropping real images into `assets/products` only
changes that one component.

The backend specs shipped with the design (SQLite outbox, Fastify, NATS
JetStream, Envoy JWT, TypeBox contracts) are not implemented here; the UI is
built against the local-first behaviour they describe.
