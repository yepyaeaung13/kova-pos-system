import { Scroll, signal, Text, View } from "nsh";
import { Icon } from "../../ui/Icon";
import { Button } from "../../ui/Button";
import { Screen } from "../../ui/Screen";
import { Chip, StatusPill } from "../../ui/Badge";
import { StatTile } from "../../ui/Card";
import { ProgressBar } from "../../ui/Charts";
import { TableWrap, Head, HeadCell, Row, Cell, TextCell } from "../../ui/Table";
import { Drawer } from "../../ui/Drawer";
import { Field, TextBox } from "../../ui/Field";
import {
  adjustTarget,
  inventory,
  navigate,
  searchQuery,
  updateStockItem,
} from "../../store";
import { loadLedger, saveStockItem, type LedgerRow } from "../../db/repo";
import { money, count } from "../../format";

const filters = ["All", "Coffee", "Dairy", "Bakery", "Syrups", "Packaging", "Food"] as const;

const tones = {
  OK: "success",
  Low: "warn",
  Critical: "error",
  Out: "error",
} as const;

const ledgerLabels: Record<string, string> = {
  grn: "Goods received",
  adjustment: "Adjustment",
  sale_bom: "Sale BOM",
  transfer: "Transfer",
};

function at(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return (
    String(date.getHours()).padStart(2, "0") +
    ":" +
    String(date.getMinutes()).padStart(2, "0")
  );
}

export function StockItemsScreen() {
  const filter = signal<(typeof filters)[number]>("All");
  const selected = signal<string | null>(null);
  const ledger = signal<LedgerRow[]>([]);
  const parText = signal("");
  const costText = signal("");
  const saved = signal("");

  const visible = () =>
    inventory().filter((item) => {
      const inCategory = filter() === "All" || item.category === filter();
      const query = searchQuery().trim().toLowerCase();
      const inQuery =
        query === "" ||
        item.name.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query);
      return inCategory && inQuery;
    });

  const totalValue = () =>
    visible().reduce((sum, item) => sum + item.onHand * item.unitCost, 0);

  const current = () => inventory().find((item) => item.sku === selected()) ?? null;

  const openItem = (sku: string) => {
    const item = inventory().find((entry) => entry.sku === sku);
    if (!item) return;
    selected.set(sku);
    parText.set(String(item.par));
    costText.set(item.unitCost.toFixed(2));
    ledger.set([]);
    saved.set("");
    void loadLedger(sku)
      .then((rows) => {
        if (selected() === sku) ledger.set(rows);
      })
      .catch(() => undefined);
  };

  const saveItem = () => {
    const item = current();
    if (!item) return;
    const par = Math.max(0, Number(parText()) || 0);
    const cost = Math.max(0, Number(costText()) || 0);
    updateStockItem(item.sku, { par, unitCost: cost });
    saved.set("Saved · par and cost updated");
    void saveStockItem({
      sku: item.sku,
      par,
      unitCostCents: Math.round(cost * 100),
      onHand: item.onHand,
    }).catch((error) => {
      console.log("stock item not written to sqlite: " + (error?.message ?? error));
    });
  };

  return (
    <Screen
      scroll={false}
      title="Stock items"
      subtitle="Counts, costs, par levels and the movement ledger"
      actions={
        <>
          <Button label="Export" icon="download" />
          <Button label="New item" icon="add" variant="primary" onPress={() => navigate("add-stock-item")} />
        </>
      }
    >
      <View class="flex-row gap-3">
        <StatTile label="SKUs tracked" value={count(inventory().length)} hint="4 categories" icon="qr_code_2" />
        <StatTile label="Value on hand" value={money(totalValue())} hint="moving average" icon="payments" tone="success" />
        <StatTile
          label="Below par"
          value={count(inventory().filter((item) => item.status !== "OK").length)}
          hint="includes out of stock"
          icon="warning"
          tone="warn"
        />
        <StatTile label="Suppliers" value="5" hint="3 active this week" icon="local_shipping" tone="info" />
      </View>

      <View class="flex-row items-center gap-2">
        <Each of={filters}>
          {(name) => (
            <Chip
              label={name()}
              selected={filter() === name()}
              count={
                name() === "All"
                  ? inventory().length
                  : inventory().filter((item) => item.category === name()).length
              }
              onPress={() => filter.set(name())}
            />
          )}
        </Each>
        <View class="flex-1" />
        <Text class="font-body text-body-sm text-outline tabular-nums">
          {visible().length} items · {money(totalValue())} on hand
        </Text>
      </View>

      <TableWrap class="flex-1 min-h-0">
        <Scroll class="flex-1">
          <Head>
            <HeadCell label="SKU" flex={1.1} />
            <HeadCell label="Item" flex={2.5} />
            <HeadCell label="On hand" flex={1.4} />
            <HeadCell label="Unit cost" flex={1} align="right" />
            <HeadCell label="Value" flex={1.1} align="right" />
            <HeadCell label="Supplier" flex={1.3} />
            <HeadCell label="Status" flex={0.9} />
            <HeadCell label="" w={46} />
          </Head>
          <Each of={visible()}>
            {(item) => (
              <Row>
                <TextCell text={item().sku} flex={1.1} mono muted />
                <Cell flex={2.5}>
                  <View class="gap-0 min-w-0">
                    <Text class="font-label text-label-md text-on-surface truncate">{item().name}</Text>
                    <Text class="font-body text-body-sm text-outline">{item().category}</Text>
                  </View>
                </Cell>
                <Cell flex={1.4}>
                  <View class="w-full gap-1">
                    <View class="flex-row items-center justify-between">
                      <Text class="font-label text-label-sm tabular-nums text-on-surface">
                        {item().onHand} {item().unit}
                      </Text>
                      <Text class="font-body text-body-sm tabular-nums text-outline">par {item().par}</Text>
                    </View>
                    <ProgressBar
                      value={Math.min(1, item().onHand / (item().par || 1))}
                      height={4}
                      color={item().status === "OK" ? "#3F5E27" : item().status === "Low" ? "#B44326" : "#BA1A1A"}
                    />
                  </View>
                </Cell>
                <TextCell text={money(item().unitCost)} flex={1} align="right" muted />
                <TextCell text={money(item().onHand * item().unitCost)} flex={1.1} align="right" strong />
                <Cell flex={1.3}>
                  <Text class="font-body text-body-md text-on-surface-variant truncate">{item().supplier}</Text>
                </Cell>
                <Cell flex={0.9}>
                  <StatusPill label={item().status} tone={tones[item().status]} />
                </Cell>
                <Cell w={46} align="right">
                  <View
                    role="button"
                    accessibilityLabel={"Open " + item().name}
                    onPress={() => openItem(item().sku)}
                    class="h-7 w-7 items-center justify-center rounded-sm border border-outline-variant hover:bg-surface-container"
                  >
                    <Icon name="chevron_right" size={14} />
                  </View>
                </Cell>
              </Row>
            )}
          </Each>
        </Scroll>
      </TableWrap>

      <View class="flex-row items-center justify-between rounded-md border border-outline-variant bg-surface-container-low px-4 py-2.5">
        <View class="flex-row items-center gap-2">
          <Icon name="swap_horiz" size={16} color="#6B5752" />
          <Text class="font-body text-body-sm text-outline">
            Counts change through receipts, adjustments and transfers — never edited directly.
          </Text>
        </View>
        <Button label="New adjustment" size="sm" icon="tune" onPress={() => navigate("new-adjustment")} />
      </View>

      <If when={current()}>
        {() => {
          const item = current();
          if (!item) return null;
          return (
            <Drawer
              onClose={() => selected.set(null)}
              title={item.name}
              subtitle={item.sku + " · " + item.category + " · " + item.supplier}
            >
              <Scroll class="flex-1" contentClass="p-4 gap-4">
                <View class="flex-row items-center justify-between">
                  <StatusPill label={item.status} tone={tones[item.status]} />
                  <Text class="font-body text-body-sm text-outline">
                    {item.unit} · moving average
                  </Text>
                </View>

                <View class="flex-row gap-2">
                  <View class="flex-1 gap-0 rounded-md border border-outline-variant bg-surface-container-low p-3">
                    <Text class="font-label text-label-sm uppercase text-outline">On hand</Text>
                    <Text class="font-title text-headline-md tabular-nums text-on-surface">
                      {item.onHand} {item.unit}
                    </Text>
                  </View>
                  <View class="flex-1 gap-0 rounded-md border border-outline-variant bg-surface-container-low p-3">
                    <Text class="font-label text-label-sm uppercase text-outline">Value</Text>
                    <Text class="font-title text-headline-md tabular-nums text-on-surface">
                      {money(item.onHand * item.unitCost)}
                    </Text>
                  </View>
                </View>

                <View class="gap-3 rounded-md border border-outline-variant bg-surface-container-lowest p-3">
                  <View class="flex-row gap-2">
                    <View class="flex-1">
                      <Field label="Par level" hint={"in " + item.unit}>
                        <TextBox value={parText()} onChange={(value) => parText.set(value)} />
                      </Field>
                    </View>
                    <View class="flex-1">
                      <Field label="Unit cost">
                        <TextBox value={costText()} onChange={(value) => costText.set(value)} />
                      </Field>
                    </View>
                  </View>
                  <View class="flex-row items-center justify-between gap-2">
                    <If when={saved() !== ""}>
                      <Text class="flex-1 font-body text-body-sm text-secondary">{saved()}</Text>
                    </If>
                    <Button label="Save par & cost" size="sm" icon="save" onPress={saveItem} />
                  </View>
                </View>

                <View class="gap-2">
                  <Text class="font-label text-label-sm uppercase tracking-label text-outline">
                    Stock ledger
                  </Text>
                  <If
                    when={ledger().length > 0}
                    else={
                      <Text class="font-body text-body-sm text-outline">
                        No movements recorded on this machine yet.
                      </Text>
                    }
                  >
                    <Each of={ledger()}>
                      {(row) => (
                        <View class="flex-row items-center justify-between gap-2 border-t border-outline-variant/60 pt-2">
                          <View class="gap-0 min-w-0">
                            <Text class="font-body text-body-md text-on-surface truncate">
                              {ledgerLabels[row().ref_type] ?? row().ref_type}
                            </Text>
                            <Text class="font-body text-body-sm text-outline tabular-nums">
                              {row().ref_id} · {at(row().created_at)}
                            </Text>
                          </View>
                          <Text
                            class={
                              "font-label text-label-md tabular-nums " +
                              (Number(row().delta_qty) < 0 ? "text-error" : "text-secondary")
                            }
                          >
                            {Number(row().delta_qty) > 0 ? "+" : ""}
                            {Number(row().delta_qty)} {item.unit}
                          </Text>
                        </View>
                      )}
                    </Each>
                  </If>
                </View>
              </Scroll>

              <View class="gap-2 border-t border-outline-variant p-4">
                <Button
                  label="Adjust stock"
                  icon="tune"
                  variant="primary"
                  onPress={() => {
                    adjustTarget.set(item.sku);
                    selected.set(null);
                    navigate("new-adjustment");
                  }}
                />
                <View class="flex-row gap-2">
                  <Button
                    label="Receive stock"
                    icon="local_shipping"
                    grow
                    onPress={() => {
                      selected.set(null);
                      navigate("purchases");
                    }}
                  />
                  <Button
                    label="Open ledger"
                    icon="history"
                    grow
                    onPress={() => openItem(item.sku)}
                  />
                </View>
              </View>
            </Drawer>
          );
        }}
      </If>
    </Screen>
  );
}
