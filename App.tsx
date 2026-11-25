import { mount } from "nsh";
import "./src/fonts";
import { AppShell } from "./src/layout/AppShell";
import { initDb } from "./src/db/repo";
import {
  hydrateCatalog,
  hydrateInventory,
  hydrateManagerPin,
  hydrateSales,
} from "./src/store";
import { startSync } from "./src/sync/worker";

/**
 * Boot the offline layer before the first sync pass: open the WAL database,
 * replay committed sales into the UI, then start the outbox worker. A missing
 * database leaves the register fully usable in memory.
 */
initDb().then((ready) => {
  if (!ready) return;
  return hydrateCatalog().then(() =>
    hydrateInventory().then(() =>
      hydrateManagerPin().then(() =>
        hydrateSales().then(() => {
          startSync();
        }),
      ),
    ),
  );
});

mount(AppShell);
