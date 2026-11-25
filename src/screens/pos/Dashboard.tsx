import { Scroll, Text, View } from "nsh";
import { Icon } from "../../ui/Icon";
import { Button } from "../../ui/Button";
import { CardHeader, Eyebrow, StatTile } from "../../ui/Card";
import { BarsChart, Donut, ProgressBar, ShareRow } from "../../ui/Charts";
import { StatusPill } from "../../ui/Badge";
import { cashier, inventory, kitchen, navigate, switchApp } from "../../store";
import {
  categoryMix,
  hourlySales,
  paymentMix,
  revenueWeek,
  topProducts,
} from "../../data/mock";
import { money, count } from "../../format";

const lowStock = () =>
  inventory().filter(
    (item) => item.status === "Low" || item.status === "Critical" || item.status === "Out",
  );

export function DashboardScreen() {
  return (
    <Scroll class="flex-1" contentClass="p-6 gap-5">
      <View class="flex-row items-center justify-between gap-3">
        <View class="gap-0.5">
          <Text class="font-headline text-headline-lg text-on-surface">
            Good morning, {cashier.name.split(" ")[0]}
          </Text>
          <Text class="font-body text-body-sm text-outline">
            Tuesday, 25 November · Kova Café, Gulberg · shift open since{" "}
            {cashier.shiftStarted}
          </Text>
        </View>
        <View class="flex-row items-center gap-2">
          <View class="flex-row items-center gap-2 rounded border border-outline-variant bg-surface-container-lowest px-3 py-2">
            <Icon name="calendar_today" size={18} color="#6B5752" />
            <Text class="font-label text-label-md text-on-surface">Today</Text>
            <Icon name="expand_more" size={16} color="#6B5752" />
          </View>
          <Button
            label="New sale"
            icon="add"
            variant="primary"
            onPress={() => navigate("register")}
          />
        </View>
      </View>

      <View class="flex-row gap-3">
        <StatTile
          label="Gross sales"
          value={money(4820.5)}
          delta="+18.2%"
          positive
          hint="vs yesterday"
          icon="payments"
          tone="neutral"
        />
        <StatTile
          label="Orders"
          value={count(186)}
          delta="+12.4%"
          positive
          hint="vs yesterday"
          icon="receipt_long"
          tone="info"
        />
        <StatTile
          label="Average ticket"
          value={money(25.92)}
          delta="+4.8%"
          positive
          hint="vs yesterday"
          icon="trending_up"
          tone="success"
        />
        <StatTile
          label="Waste this week"
          value={money(742.6)}
          delta="−2.1%"
          positive
          hint="of 4.2% of sales"
          icon="delete_sweep"
          tone="warn"
        />
      </View>

      <View class="flex-row gap-4">
        <View class="flex-col gap-4 rounded-md border border-outline-variant bg-surface-container-lowest p-4" style={{ flex: 2 }}>
          <CardHeader title="Sales this week" hint="Gross, all channels">
            <View class="flex-row items-center gap-1.5 rounded-full bg-surface-container px-2.5 py-1">
              <View class="h-2 w-2 rounded-full bg-primary-container" />
              <Text class="font-label text-label-sm text-on-surface-variant">This week</Text>
            </View>
            <Text class="font-title text-title-md tabular-nums text-on-surface">
              {money(33210)}
            </Text>
          </CardHeader>
          <BarsChart data={revenueWeek} height={168} highlight={5} />
          <View class="flex-row items-center justify-between border-t border-outline-variant pt-3">
            <View class="gap-0">
              <Eyebrow label="Best day" />
              <Text class="font-title text-title-md text-on-surface">Saturday</Text>
            </View>
            <View class="gap-0">
              <Eyebrow label="Peak hour" />
              <Text class="font-title text-title-md text-on-surface">12:00 – 1:00 PM</Text>
            </View>
            <View class="gap-0">
              <Eyebrow label="Covers" />
              <Text class="font-title text-title-md text-on-surface tabular-nums">1,284</Text>
            </View>
          </View>
        </View>

        <View class="flex-col gap-4 rounded-md border border-outline-variant bg-surface-container-lowest p-4" style={{ flex: 1 }}>
          <CardHeader title="Payment mix" hint="Today" />
          <View class="flex-row items-center gap-4">
            <Donut segments={paymentMix.map((row) => ({ value: row.value, color: row.color }))} size={132} thickness={15}>
              <View class="items-center">
                <Text class="font-title text-title-lg tabular-nums text-on-surface">186</Text>
                <Text class="font-body text-body-sm text-outline">orders</Text>
              </View>
            </Donut>
            <View class="flex-1 gap-2.5">
              <Each of={paymentMix}>
                {(slice) => (
                  <View class="flex-row items-center justify-between gap-2">
                    <View class="flex-row items-center gap-2">
                      <View class="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice().color }} />
                      <Text class="font-body text-body-md text-on-surface">{slice().label}</Text>
                    </View>
                    <Text class="font-label text-label-md tabular-nums text-on-surface-variant">
                      {slice().value}%
                    </Text>
                  </View>
                )}
              </Each>
            </View>
          </View>
          <View class="gap-2 border-t border-outline-variant pt-3">
            <Each of={categoryMix.slice(0, 3)}>
              {(row) => (
                <ShareRow
                  label={row().label}
                  value={money(row().value)}
                  ratio={row().ratio}
                />
              )}
            </Each>
          </View>
        </View>
      </View>

      <View class="flex-row gap-4">
        <View class="gap-3 rounded-md border border-outline-variant bg-surface-container-lowest p-4" style={{ flex: 1 }}>
          <CardHeader title="Top sellers" hint="Today by quantity" />
          <Each of={topProducts}>
            {(item, index) => (
              <View class="flex-row items-center gap-3 border-t border-outline-variant/60 pt-2.5">
                <Text class="w-4 font-label text-label-md tabular-nums text-outline">{(index() + 1).toString()}</Text>
                <View class="flex-1 gap-1">
                  <View class="flex-row items-center justify-between gap-2">
                    <Text class="font-body text-body-md text-on-surface truncate">{item().name}</Text>
                    <Text class="font-label text-label-md tabular-nums text-on-surface">{count(item().qty)}</Text>
                  </View>
                  <ProgressBar value={item().qty / 42} height={4} />
                </View>
                <Text class="w-16 text-right font-body text-body-sm tabular-nums text-outline">
                  {money(item().revenue)}
                </Text>
              </View>
            )}
          </Each>
        </View>

        <View class="gap-3 rounded-md border border-outline-variant bg-surface-container-lowest p-4" style={{ flex: 1.4 }}>
          <CardHeader title="Live orders" hint="Kitchen queue">
            <Button label="Open board" size="sm" onPress={() => navigate("orders")} />
          </CardHeader>
          <Each of={kitchen().slice(0, 4)}>
            {(order) => (
              <View class="flex-row items-center justify-between gap-2 border-t border-outline-variant/60 pt-2.5">
                <View class="flex-row items-center gap-2.5">
                  <View class="h-8 w-8 items-center justify-center rounded-sm bg-surface-container">
                    <Text class="font-label text-label-sm tabular-nums text-on-surface-variant">
                      {order().id.slice(-2)}
                    </Text>
                  </View>
                  <View class="gap-0">
                    <Text class="font-label text-label-md text-on-surface">
                      #{order().id} · {order().table}
                    </Text>
                    <Text class="font-body text-body-sm text-outline truncate">
                      {order().items.join(" · ")}
                    </Text>
                  </View>
                </View>
                <View class="items-end gap-1">
                  <Text class="font-label text-label-md tabular-nums text-on-surface">
                    {money(order().total)}
                  </Text>
                  <StatusPill
                    label={order().status}
                    tone={
                      order().status === "New"
                        ? "info"
                        : order().status === "Preparing"
                          ? "warn"
                          : order().status === "Ready"
                            ? "success"
                            : "neutral"
                    }
                  />
                </View>
              </View>
            )}
          </Each>
        </View>

        <View class="gap-3 rounded-md border border-outline-variant bg-surface-container-lowest p-4" style={{ flex: 1 }}>
          <CardHeader title="Low stock" hint={lowStock().length + " items need attention"} />
          <Each of={lowStock().slice(0, 5)}>
            {(item) => (
              <View class="flex-row items-center justify-between gap-2 border-t border-outline-variant/60 pt-2.5">
                <View class="flex-1 gap-0 min-w-0">
                  <Text class="font-body text-body-md text-on-surface truncate">{item().name}</Text>
                  <Text class="font-body text-body-sm text-outline tabular-nums">
                    {item().onHand} / {item().par} {item().unit}
                  </Text>
                </View>
                <StatusPill
                  label={item().status}
                  tone={item().status === "Out" ? "error" : item().status === "Critical" ? "error" : "warn"}
                />
              </View>
            )}
          </Each>
          <Button label="Stock overview" size="sm" variant="ghost" iconRight="arrow_forward" onPress={() => switchApp("inventory")} />
        </View>
      </View>

      <View class="flex-row gap-4 rounded-md border border-outline-variant bg-surface-container-low p-4">
        <View class="flex-1 gap-1">
          <Eyebrow label="Shift so far" />
          <Text class="font-title text-title-lg tabular-nums text-on-surface">
            {money(4820.5)} · 186 orders
          </Text>
          <Text class="font-body text-body-sm text-outline">
            Opened {cashier.shiftStarted} · {cashier.terminal}
          </Text>
        </View>
        <MiniBarsRow />
        <View class="flex-row items-center gap-2">
          <Button label="Z-report" onPress={() => navigate("reports")} />
          <Button label="Close shift" variant="primary" onPress={() => navigate("reports")} />
        </View>
      </View>
    </Scroll>
  );
}

function MiniBarsRow() {
  return (
    <View class="flex-1 flex-row items-end gap-0.5" style={{ height: 44 }}>
      <Each of={hourlySales}>
        {(value) => (
          <View
            class="flex-1 rounded-sm"
            style={{
              height: Math.max(3, Math.round((value() / 960) * 44)),
              backgroundColor: "#B44326",
              opacity: value() > 800 ? 1 : 0.4,
            }}
          />
        )}
      </Each>
    </View>
  );
}
