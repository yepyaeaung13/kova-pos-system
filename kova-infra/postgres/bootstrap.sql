\set ON_ERROR_STOP on

\connect kova_auth
\i /init/kova-auth/001_init_auth.sql
\i /init/kova-auth/002_seed_dev.sql

\connect kova_sync
\i /init/kova-sync/001_init_sync.sql

\connect kova_sale
\i /init/kova-sale/001_init_sale.sql

\connect kova_inventory
\i /init/kova-inventory/001_init_inventory.sql
\i /init/kova-inventory/002_seed_catalog.sql

\connect kova_accounting
\i /init/kova-accounting/001_init_accounting.sql
\i /init/kova-accounting/002_seed_accounts.sql

\connect postgres
