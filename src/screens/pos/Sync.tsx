import { effect, Scroll, signal, Text, View } from "nsh";
import { Icon } from "../../ui/Icon";
import { Button } from "../../ui/Button";
import { Screen } from "../../ui/Screen";
import { CardHeader, Eyebrow, InfoRow, StatTile } from "../../ui/Card";
import { StatusPill, type Tone } from "../../ui/Badge";
import { TableWrap, Head, HeadCell, Row, Cell, TextCell } from "../../ui/Table";
import {
  discardOutbox,
  conflictList,
  outboxList,
  refreshCounts,
  retryOutbox,
  seedCounts,
  type ConflictRow,
  type OutboxRow,
} from "../../db/repo";
import { syncState } from "../../sync/state";
import { setOnline, syncNow } from "../../sync/worker";
import { money } from "../../format";

const toneFor: Record<string, Tone> = {
  pending: "warn",
  in_flight: "info",
  acked: "success",
  conflict: "error",
};

const labelFor: Record<string, string> = {
  pending: "Queued",
  in_flight: "Sending",
  acked: "Synced",
  conflict: "Conflict",
};

/** `INV-… · $14.20`, `#1049 · Dine-in · Table 4`, … */
function summarise(row: OutboxRow): string {
  try {
    const payload = JSON.parse(row.payload_json) as Record<string, any>;
    if (row.entity_type === "sale_invoice") {
      return (
        String(payload.invoice_no ?? row.entity_id) +
        " · " +
        money(Number(payload.grand_total_cents ?? 0) / 100)
      );
    }
    if (row.entity_type === "pos_order") {
      return [
        String(payload.order_no ?? row.entity_id),
        payload.channel,
        payload.table_label,
        payload.status,
      ]
        .filter(Boolean)
        .join(" · ");
    }
    if (row.entity_type === "journal_entry") {
      return String(payload.entry_no ?? row.entity_id) + " · " + String(payload.memo ?? "");
    }
    if (row.entity_type === "stock_adjustment") {
      return String(payload.adj_no ?? row.entity_id) + " · " + String(payload.reason ?? "");
    }
    if (row.entity_type === "shift") {
      return "Shift " + String(payload.shift_id ?? row.entity_id) + " · close";
    }
    return row.entity_id;
  } catch {
    return row.entity_id;
  }
}

function when(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return iso;
  return (
    String(at.getHours()).padStart(2, "0") +
    ":" +
    String(at.getMinutes()).padStart(2, "0")
  );
}

export function SyncScreen() {
  const rows = signal<OutboxRow[]>([]);
  const conflicts = signal<ConflictRow[]>([]);
  const counts = signal({ products: 0, accounts: 0, stock: 0 });
  const loading = signal(true);
  let seenWrites = -1;

  const refresh = async () => {
    try {
      const [list, open, seeds] = await Promise.all([
        outboxList(100),
        conflictList(),
        seedCounts(),
      ]);
      rows.set(list);
      conflicts.set(open);
      counts.set(seeds);
      await refreshCounts();
    } catch {
      rows.set([]);
    } finally {
      loading.set(false);
    }
  };

  void refresh();

  effect(() => {
    const writes = syncState().writeCount;
    if (writes !== seenWrites) {
      seenWrites = writes;
      void refresh();
    }
  });

  const pending = () => rows().filter((row) => row.status === "pending" || row.status === "in_flight");
  const acked = () => rows().filter((row) => row.status === "acked");

  const drain = async () => {
    if (!syncState().online) setOnline(true);
    await syncNow();
    await refresh();
  };

  return (
    <Screen
      scroll={false}
      title="SQLite outbox & sync"
      subtitle={
        syncState().dbReady
          ? "WAL database · " +
            syncState().dbPath +
            " · " +
            syncState().pending +
            " pending"
          : "Local database unavailable — the register still runs in memory"
      }
      actions={
        <>
          <Button
            label={syncState().online ? "Go offline" : "Go online"}
            icon={syncState().online ? "cloud_off" : "cloud_done"}
            onPress={() => setOnline(!syncState().online)}
          />
          <Button
            label={syncState().busy ? "Syncing…" : "Sync now"}
            icon="sync"
            variant="primary"
            disabled={syncState().busy || !syncState().dbReady}
            onPress={drain}
          />
        </>
      }
    >
      <View class="flex-row gap-3">
        <StatTile
          label="Queued writes"
          value={String(syncState().pending)}
          hint={syncState().reachable ? "gateway reachable" : "waiting for the gateway"}
          icon="cloud_upload"
          tone="warn"
        />
        <StatTile
          label="Synced"
          value={String(acked().length)}
          hint="rows acknowledged"
          icon="cloud_done"
          tone="success"
        />
        <StatTile
          label="Conflicts"
          value={String(syncState().conflicts)}
          hint={conflicts()[0]?.reason ?? "none to review"}
          icon="report"
          tone="plum"
        />
        <StatTile
          label="Cursor"
          value={String(syncState().lastSeq)}
          hint={
            syncState().lastSyncedAt
              ? "last pull " + when(syncState().lastSyncedAt!)
              : "never pulled"
          }
          icon="speed"
          tone="info"
        />
      </View>

      <View class="flex-1 flex-row gap-4 min-h-0">
        <TableWrap class="flex-1 min-h-0">
          <Scroll class="flex-1">
            <Head>
              <HeadCell label="Entity" flex={2.4} />
              <HeadCell label="Detail" flex={2.6} />
              <HeadCell label="When" flex={0.9} />
              <HeadCell label="Tries" w={54} align="right" />
              <HeadCell label="State" flex={1.1} />
              <HeadCell label="" w={92} />
            </Head>
            <Each of={rows()}>
              {(row) => (
                <Row>
                  <Cell flex={2.4}>
                    <View class="flex-row items-center gap-2 min-w-0">
                      <Icon
                        name={
                          row().status === "acked"
                            ? "check_circle"
                            : row().status === "conflict"
                              ? "error"
                              : row().status === "in_flight"
                                ? "cloud_sync"
                                : "schedule"
                        }
                        size={16}
                        color={
                          row().status === "acked"
                            ? "#3F5E27"
                            : row().status === "conflict"
                              ? "#BA1A1A"
                              : "#7E5700"
                        }
                      />
                      <View class="gap-0 min-w-0">
                        <Text class="font-label text-label-md text-on-surface truncate">
                          {row().entity_type}
                        </Text>
                        <Text class="font-body text-body-sm text-outline tabular-nums">
                          {row().service_name}
                        </Text>
                      </View>
                    </View>
                  </Cell>
                  <Cell flex={2.6}>
                    <View class="gap-0 min-w-0">
                      <Text class="font-body text-body-md text-on-surface truncate">
                        {summarise(row())}
                      </Text>
                      <If when={row().last_error}>
                        {(text) => (
                          <Text class="font-body text-body-sm text-error truncate">
                            {text()}
                          </Text>
                        )}
                      </If>
                    </View>
                  </Cell>
                  <TextCell text={when(row().created_at)} flex={0.9} muted />
                  <TextCell text={String(row().attempts)} w={54} align="right" muted />
                  <Cell flex={1.1}>
                    <StatusPill
                      label={labelFor[row().status] ?? row().status}
                      tone={toneFor[row().status] ?? "neutral"}
                    />
                  </Cell>
                  <Cell w={92} align="right">
                    <View class="flex-row items-center justify-end gap-1">
                      <If when={row().status !== "acked"}>
                        <View
                          role="button"
                          accessibilityLabel="Retry mutation"
                          onPress={() => {
                            void retryOutbox(row().id).then(refresh);
                          }}
                          class="h-6 w-6 items-center justify-center rounded-sm border border-outline-variant hover:bg-surface-container"
                        >
                          <Icon name="refresh" size={13} />
                        </View>
                      </If>
                      <View
                        role="button"
                        accessibilityLabel="Discard mutation"
                        onPress={() => {
                          void discardOutbox(row().id).then(refresh);
                        }}
                        class="h-6 w-6 items-center justify-center rounded-sm border border-outline-variant hover:bg-error-container"
                      >
                        <Icon name="close" size={13} />
                      </View>
                    </View>
                  </Cell>
                </Row>
              )}
            </Each>
            <If when={rows().length === 0}>
              <View class="items-center justify-center gap-2 py-10">
                <Icon name={syncState().dbReady ? "cloud_done" : "warning"} size={28} color={syncState().dbReady ? "#3F5E27" : "#7E5700"} />
                <Text class="font-body text-body-md text-on-surface">
                  {syncState().dbReady
                    ? "The outbox is empty — every local write is in the cloud."
                    : "The local database could not be opened."}
                </Text>
                <Text class="font-body text-body-sm text-outline">
                  {syncState().dbReady
                    ? "New sales and stock movements appear here before they sync."
                    : syncState().lastError ?? "Run on desktop with the sqlite3 capability granted."}
                </Text>
              </View>
            </If>
          </Scroll>
        </TableWrap>

        <Scroll class="shrink-0" style={{ width: 340 }} contentClass="gap-3 pb-2">
          <View class="gap-2.5 rounded-md border border-outline-variant bg-surface-container-lowest p-4">
            <CardHeader title="Queue health" hint="Local database" />
            <InfoRow label="Engine" value={syncState().dbReady ? "SQLite " + (syncState().dbVersion ?? "") : "Unavailable"} />
            <InfoRow label="Journal" value={syncState().dbReady ? "WAL" : "—"} />
            <InfoRow label="Sync mode" value="NORMAL" />
            <InfoRow label="Pending" value={String(syncState().pending)} />
            <InfoRow label="Gateway" value={syncState().gateway} />
            <InfoRow label="State" value={syncState().online ? (syncState().reachable ? "Online" : "Queueing") : "Offline"} />
            <InfoRow label="Catalog rows" value={counts().products + " products · " + counts().stock + " stock"} />
            <InfoRow label="Accounts" value={String(counts().accounts)} />
            <Text class="font-body text-body-sm text-outline line-clamp-3">
              {syncState().lastError ?? "Nothing failed since the last drain."}
            </Text>
          </View>

          <If when={conflicts().length > 0}>
            <View class="gap-2.5 rounded-md border border-error/20 bg-error-container p-4">
              <View class="flex-row items-center gap-2">
                <Icon name="report" size={18} color="#BA1A1A" />
                <Text class="font-title text-title-md text-on-error-container">
                  {conflicts().length} conflict{conflicts().length === 1 ? "" : "s"}
                </Text>
              </View>
              <Each of={conflicts()}>
                {(conflict) => (
                  <View class="gap-1 border-t border-error/15 pt-2">
                    <Text class="font-label text-label-md text-on-error-container">
                      {conflict().entity_type}
                    </Text>
                    <Text class="font-body text-body-sm text-on-error-container">
                      {conflict().reason}
                    </Text>
                    <Button
                      label="Retry"
                      size="sm"
                      variant="danger"
                      onPress={() => {
                        void retryOutbox(conflict().outbox_id).then(refresh);
                      }}
                    />
                  </View>
                )}
              </Each>
            </View>
          </If>

          <View class="gap-2 rounded-md border border-outline-variant bg-surface-container-low p-4">
            <Eyebrow label="How it works" />
            <Text class="font-body text-body-sm text-on-surface-variant">
              Every sale writes its order, invoice, payment and journal line in one
              SQLite transaction, with the matching outbox rows. The worker pushes
              up to 50 at a time, then pulls deltas and advances the cursors.
            </Text>
            <Text class="font-body text-body-sm text-on-surface-variant">
              A failed push backs off 5s, 10s, 20s … up to 5 minutes and 8 tries;
              conflicts stay here for review.
            </Text>
          </View>
        </Scroll>
      </View>
    </Screen>
  );
}
