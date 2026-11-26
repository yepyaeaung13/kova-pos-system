import { Text, View } from "nsh";
import { Icon } from "../../ui/Icon";
import { Button } from "../../ui/Button";
import { Screen } from "../../ui/Screen";
import { CardHeader, Eyebrow, StatTile } from "../../ui/Card";
import { ProgressBar } from "../../ui/Charts";
import { StatusPill } from "../../ui/Badge";
import { TableWrap, Head, HeadCell, Row, Cell, TextCell } from "../../ui/Table";
import { inventory, navigate, switchApp } from "../../store";
import { adjustments as adjustmentFixtures, grns as grnFixtures, suppliers as supplierFixtures, type StockStatus } from "../../data/ops";
import { loadSuppliers, loadGrns, type Supplier, type GrnRow } from "../../db/repo";
import { signal } from "nsh";
import { money, count } from "../../format";

const toneFor: Record<StockStatus, "success" | "warn" | "error"> = {
  OK: "success",
  Low: "warn",
  Critical: "error",
  Out: "error",
};

export function StockOverviewScreen() {
  const supplierList = signal<Supplier[]>([...supplierFixtures]);
  const grnList = signal<GrnRow[]>([]);
  void loadSuppliers().then((rows) => supplierList.set(rows)).catch(() => undefined);
  void loadGrns(3).then((rows) => grnList.set(rows)).catch(() => undefined);

  const value = () => inventory().reduce((sum, item) => sum + item.onHand * item.unitCost, 0);
  const low = () => inventory().filter((item) => item.status !== "OK").length;
  const out = () => inventory().filter((item) => item.status === "Out").length;
  const critical = () => inventory().filter((item) => item.status !== "OK");

  return (
    <Screen
      scroll
      title="Stock overview"
      subtitle="Gulberg Café · 14 SKUs · updated 2 minutes ago"
      actions={
        <>
          <Button label="New adjustment" icon="tune" onPress={() => navigate("new-adjustment")} />
          <Button label="New purchase order" icon="add" variant="primary" onPress={() => navigate("purchase-orders")} />
        </>
      }
    >
      <View class="flex-row gap-3">
        <StatTile label="Stock value" value={money(value())} delta="+2.4%" positive hint="vs last week" icon="inventory_2" />
        <StatTile label="Low or critical" value={count(low())} hint="below par level" icon="warning" tone="warn" />
        <StatTile label="Out of stock" value={count(out())} hint="blocks menu items" icon="block" tone="plum" />
        <StatTile label="Waste this week" value={money(742.6)} delta="−2.1%" positive hint="4.2% of sales" icon="delete_sweep" />
      </View>

      <View class="flex-row gap-4">
        <TableWrap class="flex-1">
          <View class="flex-row items-center justify-between px-4 py-3">
            <CardHeader title="Needs attention" hint="Order today to stay ahead" />
            <Button label="Create PO" size="sm" variant="soft" icon="add" onPress={() => navigate("purchase-orders")} />
          </View>
          <Head>
            <HeadCell label="Item" flex={2.2} />
            <HeadCell label="On hand" flex={1.2} />
            <HeadCell label="Par" flex={0.9} align="right" />
            <HeadCell label="Supplier" flex={1.4} />
            <HeadCell label="Status" flex={1} />
          </Head>
          <Each of={critical()}>
            {(item) => (
              <Row>
                <Cell flex={2.2}>
                  <View class="gap-0 min-w-0">
                    <Text class="font-label text-label-md text-on-surface truncate">{item().name}</Text>
                    <Text class="font-body text-body-sm text-outline">{item().sku} · {item().category}</Text>
                  </View>
                </Cell>
                <Cell flex={1.2}>
                  <View class="w-full gap-1">
                    <Text class="font-label text-label-sm tabular-nums text-on-surface">
                      {item().onHand} {item().unit}
                    </Text>
                    <ProgressBar
                      value={Math.min(1, item().onHand / item().par)}
                      height={4}
                      color={item().status === "Out" ? "#BA1A1A" : item().status === "Critical" ? "#BA1A1A" : "#B44326"}
                    />
                  </View>
                </Cell>
                <TextCell text={String(item().par)} flex={0.9} align="right" muted />
                <Cell flex={1.4}>
                  <Text class="font-body text-body-md text-on-surface-variant truncate">{item().supplier}</Text>
                </Cell>
                <Cell flex={1}>
                  <StatusPill label={item().status} tone={toneFor[item().status]} />
                </Cell>
              </Row>
            )}
          </Each>
        </TableWrap>

        <View class="gap-3" style={{ width: 360 }}>
          <View class="gap-3 rounded-md border border-outline-variant bg-surface-container-lowest p-4">
            <CardHeader title="Next deliveries" hint="This week" />
            <Each of={supplierList().slice(0, 3)}>
              {(supplier) => (
                <View class="flex-row items-center justify-between gap-2 border-t border-outline-variant/60 pt-2.5">
                  <View class="flex-row items-center gap-2">
                    <View class="h-7 w-7 items-center justify-center rounded-sm bg-surface-container">
                      <Icon name="local_shipping" size={15} />
                    </View>
                    <View class="gap-0">
                      <Text class="font-label text-label-md text-on-surface">{supplier().name}</Text>
                      <Text class="font-body text-body-sm text-outline">
                        {supplier().lead_days}-day lead · {supplier().items} SKUs
                      </Text>
                    </View>
                  </View>
                  <Text class="font-label text-label-sm tabular-nums text-outline">{supplier().last_delivery}</Text>
                </View>
              )}
            </Each>
          </View>

          <View class="gap-2 rounded-md border border-outline-variant bg-surface-container-lowest p-4">
            <CardHeader title="Last stock movements" hint="Adjustments & receipts" />
            <Each of={adjustmentFixtures.slice(0, 3)}>
              {(row) => (
                <View class="flex-row items-center justify-between gap-2 border-t border-outline-variant/60 pt-2">
                  <View class="gap-0">
                    <Text class="font-label text-label-md tabular-nums text-on-surface">{row().adj_no}</Text>
                    <Text class="font-body text-body-sm text-outline">{row().reason} · {row().branch_id}</Text>
                  </View>
                  <Text
                    class={
                      "font-label text-label-md tabular-nums " +
                      (row().delta_qty < 0 ? "text-error" : "text-secondary")
                    }
                  >
                    {row().delta_qty < 0 ? "−" : "+"}{money(Math.abs(row().delta_qty))}
                  </Text>
                </View>
              )}
            </Each>
          </View>

          <View class="gap-2 rounded-md border border-outline-variant bg-surface-container-low p-4">
            <Eyebrow label="Latest receipt" />
            <Text class="font-title text-title-md text-on-surface">{grnList().length > 0 ? grnList()[0].number : "—"}</Text>
            <Text class="font-body text-body-sm text-on-surface-variant">
              {grnList().length > 0 ? grnList()[0].supplier + " · " + grnList()[0].lines + " lines · " + money(grnList()[0].total_cents / 100) : "No receipts yet"}
            </Text>
            <Button label="Open goods received" size="sm" variant="ghost" iconRight="arrow_forward" onPress={() => navigate("grn-history")} />
          </View>
        </View>
      </View>

      <View class="flex-row items-center justify-between rounded-md border border-outline-variant bg-surface-container-low px-4 py-3">
        <View class="flex-row items-center gap-2">
          <Icon name="info" size={16} color="#6B5752" />
          <Text class="font-body text-body-sm text-outline">
            Stock is valued at moving average cost. Counts are per branch, not pooled.
          </Text>
        </View>
        <Button label="Open stock items" size="sm" iconRight="arrow_forward" onPress={() => navigate("stock-items")} />
      </View>
    </Screen>
  );
}
