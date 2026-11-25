import { computed, Scroll, signal, Text, View } from "nsh";
import { Icon } from "../../ui/Icon";
import { Button } from "../../ui/Button";
import { Chip, StatusPill, type Tone } from "../../ui/Badge";
import { StatTile } from "../../ui/Card";
import { Drawer } from "../../ui/Drawer";
import {
  channel,
  clearTable,
  diningTables,
  guests,
  navigate,
  requestBill,
  seatTable,
  tableLabel,
} from "../../store";
import type { DiningTable } from "../../data/tables";
import { money } from "../../format";

type TableStatus = DiningTable["status"];

const sections = ["All", "Main", "Terrace", "Bar"] as const;

const toneFor: Record<TableStatus, Tone> = {
  Free: "neutral",
  Seated: "info",
  Ordering: "warn",
  Served: "success",
  "Needs bill": "plum",
};

const edgeFor: Record<TableStatus, string> = {
  Free: "#E0DDD5",
  Seated: "#2F5372",
  Ordering: "#7E5700",
  Served: "#3F5E27",
  "Needs bill": "#75376A",
};

export function TablesScreen() {
  const section = signal<(typeof sections)[number]>("All");
  const selected = signal<string | null>(null);

  const filtered = computed(() =>
    diningTables().filter(
      (table) => section() === "All" || table.section === section(),
    ),
  );

  const rows = computed(() => {
    const list = filtered();
    const result: DiningTable[][] = [];
    for (let i = 0; i < list.length; i += 4) result.push(list.slice(i, i + 4));
    return result;
  });

  const occupied = computed(() =>
    diningTables().filter((table) => table.status !== "Free"),
  );
  const covers = computed(() =>
    occupied().reduce((sum, table) => sum + table.seats, 0),
  );
  const openAmount = computed(() =>
    occupied().reduce((sum, table) => sum + (table.amount ?? 0), 0),
  );

  const current = () =>
    diningTables().find((table) => table.id === selected()) ?? null;

  const openTable = (table: DiningTable) => {
    if (table.status === "Free") {
      seatTable(table.id);
      navigate("register");
      return;
    }
    selected.set(table.id);
  };

  const openOnRegister = (table: DiningTable) => {
    tableLabel.set(table.label);
    guests.set(table.seats);
    channel.set("Dine-in");
    selected.set(null);
    navigate("register");
  };

  return (
    <View class="flex-1 flex-col gap-4 p-6 min-h-0" style={{ position: "relative" }}>
      <View class="flex-row items-center justify-between gap-3">
        <View class="gap-0.5">
          <Text class="font-headline text-headline-lg text-on-surface">Tables</Text>
          <Text class="font-body text-body-sm text-outline">
            Floor plan · {diningTables().length} tables · {occupied().length} open ·{" "}
            {covers()} covers
          </Text>
        </View>
        <View class="flex-row items-center gap-2">
          <Button label="New walk-in" icon="person_add" onPress={() => navigate("register")} />
          <Button
            label="Open register"
            icon="shopping_cart"
            variant="primary"
            onPress={() => navigate("register")}
          />
        </View>
      </View>

      <View class="flex-row gap-3">
        <StatTile
          label="Free tables"
          value={String(diningTables().filter((table) => table.status === "Free").length)}
          hint="ready to seat"
          icon="table_restaurant"
        />
        <StatTile
          label="Open tickets"
          value={String(occupied().length)}
          hint="seated or served"
          icon="receipt_long"
          tone="info"
        />
        <StatTile
          label="Needs bill"
          value={String(
            diningTables().filter((table) => table.status === "Needs bill").length,
          )}
          hint="waiting to settle"
          icon="request_quote"
          tone="plum"
        />
        <StatTile
          label="On the floor"
          value={money(openAmount())}
          hint="open ticket value"
          icon="payments"
          tone="success"
        />
      </View>

      <View class="flex-row items-center gap-2">
        <Each of={sections}>
          {(name) => (
            <Chip
              label={name()}
              selected={section() === name()}
              count={
                name() === "All"
                  ? diningTables().length
                  : diningTables().filter((table) => table.section === name()).length
              }
              onPress={() => section.set(name())}
            />
          )}
        </Each>
        <View class="flex-1" />
        <View class="flex-row items-center gap-1.5 rounded-full bg-surface-container px-3 py-1.5">
          <Icon name="schedule" size={15} color="#6B5752" />
          <Text class="font-label text-label-sm text-on-surface-variant">
            Turn time 42 min · service 9:00–17:00
          </Text>
        </View>
      </View>

      <Scroll class="flex-1" contentClass="gap-3 pb-2">
        <Each of={rows()}>
          {(row) => (
            <View class="flex-row gap-3">
              <Each of={row()}>
                {(table) => (
                  <View
                    role="button"
                    accessibilityLabel={table().label}
                    onPress={() => openTable(table())}
                    class="flex-1 gap-2 rounded-md border border-outline-variant bg-surface-container-lowest p-3 hover:border-outline"
                    style={{
                      borderLeftWidth: 4,
                      borderLeftColor: edgeFor[table().status],
                    }}
                  >
                    <View class="flex-row items-start justify-between gap-2">
                      <View class="gap-0.5">
                        <Text class="font-title text-title-lg text-on-surface">
                          {table().label}
                        </Text>
                        <View class="flex-row items-center gap-1">
                          <Icon name="chair" size={13} color="#6B5752" />
                          <Text class="font-body text-body-sm text-outline">
                            {table().seats} seats · {table().section}
                          </Text>
                        </View>
                      </View>
                      <StatusPill label={table().status} tone={toneFor[table().status]} />
                    </View>

                    <If when={table().status !== "Free"}>
                      <View class="gap-0 border-t border-outline-variant/60 pt-2">
                        <Text class="font-label text-label-md tabular-nums text-on-surface">
                          {table().orderNo} · {money(table().amount ?? 0)}
                        </Text>
                        <Text class="font-body text-body-sm text-outline truncate">
                          {table().server} · opened {table().openedAt}
                        </Text>
                      </View>
                    </If>
                    <If when={table().status === "Free"}>
                      <Text class="font-body text-body-sm text-outline">
                        Tap to seat a walk-in
                      </Text>
                    </If>

                    <View class="flex-1" />

                    <View class="flex-row items-center justify-between pt-1">
                      <Text class="font-label text-label-sm text-primary">
                        {table().status === "Free" ? "Seat table" : "Open ticket"}
                      </Text>
                      <Icon
                        name={table().status === "Free" ? "add" : "chevron_right"}
                        size={16}
                        color="#932C10"
                      />
                    </View>
                  </View>
                )}
              </Each>
              <If when={row().length < 4}>
                {() => (
                  <View class="flex-1 flex-row gap-3">
                    {Array.from({ length: 4 - row().length }).map(() => (
                      <View class="flex-1" />
                    ))}
                  </View>
                )}
              </If>
            </View>
          )}
        </Each>
      </Scroll>

      <If when={current()}>
        {() => {
          const table = current();
          if (!table) return null;
          return (
            <Drawer
              onClose={() => selected.set(null)}
              title={table.label}
              subtitle={table.section + " · " + table.seats + " seats"}
            >
              <View class="flex-1 gap-4 p-4">
                <View class="flex-row items-center justify-between">
                  <StatusPill label={table.status} tone={toneFor[table.status]} />
                  <Text class="font-title text-title-lg tabular-nums text-on-surface">
                    {money(table.amount ?? 0)}
                  </Text>
                </View>

                <View class="gap-1 rounded-md border border-outline-variant bg-surface-container-low p-3">
                  <View class="flex-row items-center justify-between">
                    <Text class="font-body text-body-sm text-on-surface-variant">Ticket</Text>
                    <Text class="font-label text-label-md tabular-nums text-on-surface">
                      {table.orderNo}
                    </Text>
                  </View>
                  <View class="flex-row items-center justify-between">
                    <Text class="font-body text-body-sm text-on-surface-variant">Server</Text>
                    <Text class="font-label text-label-md text-on-surface">{table.server}</Text>
                  </View>
                  <View class="flex-row items-center justify-between">
                    <Text class="font-body text-body-sm text-on-surface-variant">Opened</Text>
                    <Text class="font-label text-label-md text-on-surface">{table.openedAt}</Text>
                  </View>
                  <View class="flex-row items-center justify-between">
                    <Text class="font-body text-body-sm text-on-surface-variant">Covers</Text>
                    <Text class="font-label text-label-md text-on-surface">{table.seats}</Text>
                  </View>
                </View>

                <View class="gap-2 rounded-md border border-outline-variant bg-surface-container-lowest p-3">
                  <Text class="font-label text-label-sm uppercase tracking-label text-outline">
                    Next step
                  </Text>
                  <Text class="font-body text-body-sm text-on-surface-variant">
                    {table.status === "Needs bill"
                      ? "The guest asked for the bill — settle it from the register."
                      : table.status === "Served"
                        ? "Food is served. Offer the bill or open the ticket to add more."
                        : "Open the ticket to keep ordering, or ask for the bill."}
                  </Text>
                </View>

                <View class="flex-1" />
              </View>

              <View class="gap-2 border-t border-outline-variant p-4">
                <Button
                  label="Open ticket on register"
                  icon="shopping_cart"
                  variant="primary"
                  onPress={() => openOnRegister(table)}
                />
                <View class="flex-row gap-2">
                  <Button
                    label="Request bill"
                    icon="request_quote"
                    grow
                    disabled={table.status === "Needs bill"}
                    onPress={() => requestBill(table.id)}
                  />
                  <Button
                    label="Clear table"
                    icon="check"
                    variant="soft"
                    grow
                    onPress={() => {
                      clearTable(table.id);
                      selected.set(null);
                    }}
                  />
                </View>
              </View>
            </Drawer>
          );
        }}
      </If>
    </View>
  );
}
