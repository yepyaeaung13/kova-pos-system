import { Text, View } from "nsh";
import { Icon } from "../ui/Icon";
import { SearchField } from "../ui/Field";
import { cashier, navigate, searchQuery } from "../store";
import { syncState } from "../sync/state";
import { setOnline } from "../sync/worker";

/** The workspace header: search, sync state, terminal, notifications. */
export function TopBar() {
  const state = () => syncState();

  const label = () => {
    if (!state().online) return "Offline · " + state().pending + " queued";
    if (state().busy) return "SQLite · syncing…";
    if (state().pending > 0) {
      return state().reachable
        ? "SQLite · " + state().pending + " to sync"
        : "SQLite · " + state().pending + " queued";
    }
    return "SQLite · Synced";
  };

  const healthy = () => state().online && state().pending === 0 && state().reachable;

  return (
    <View class="flex-row items-center gap-3 border-b border-outline-variant bg-surface px-4 py-3">
      <View class="flex-1 flex-row items-center gap-3">
        <SearchField
          value={searchQuery()}
          onChange={(value) => searchQuery.set(value)}
          onScan={() => {}}
        />
      </View>

      <View
        role="button"
        onPress={() => setOnline(!state().online)}
        accessibilityLabel="Toggle offline sync"
        class={
          "shrink-0 flex-row items-center gap-1.5 rounded-full border border-outline-variant px-3 py-2 " +
          (healthy() ? "bg-secondary-container" : "bg-amber-container")
        }
      >
        <View
          class={
            "h-2 w-2 rounded-full " +
            (healthy() ? "bg-secondary" : state().busy ? "bg-tertiary" : "bg-amber")
          }
        />
        <Text
          class={
            "font-label text-label-md " +
            (healthy() ? "text-on-secondary-container" : "text-on-amber-container")
          }
        >
          {label()}
        </Text>
      </View>

      <View class="flex-row items-center gap-2.5 rounded border border-outline-variant bg-surface-container-lowest px-3 py-2">
        <Icon name="storefront" size={18} color="#6B5752" />
        <View class="gap-0">
          <Text class="font-label text-label-md text-on-surface">{cashier.branch}</Text>
          <Text class="font-body text-body-sm text-outline tabular-nums">
            {cashier.terminal} · shift {cashier.shiftStarted}
          </Text>
        </View>
      </View>

      <View class="flex-row items-center gap-2">
        <View
          role="button"
          accessibilityLabel="Open the SQLite outbox"
          onPress={() => navigate("sync")}
          class="h-10 w-10 items-center justify-center rounded border border-outline-variant bg-surface-container-lowest hover:bg-surface-container"
        >
          <Icon name="notifications" size={20} />
        </View>
        <If when={state().pending > 0}>
          <View class="rounded-full bg-amber px-2 py-0.5">
            <Text class="font-label text-label-sm tabular-nums text-on-amber">
              {state().pending}
            </Text>
          </View>
        </If>
      </View>
    </View>
  );
}
