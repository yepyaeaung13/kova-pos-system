import { computed, Scroll, signal, Text, View } from "nsh";
import { Icon } from "../../ui/Icon";
import { Button } from "../../ui/Button";
import { CardHeader, Eyebrow, InfoRow, StatTile } from "../../ui/Card";
import { BarsChart, ShareRow } from "../../ui/Charts";
import { StatusPill } from "../../ui/Badge";
import { cashier, navigate } from "../../store";
import { closeShift } from "../../db/repo";
import { syncState } from "../../sync/state";
import { categoryMix, hourlySales, paymentMix, topProducts } from "../../data/mock";
import { money, count } from "../../format";

export function ReportsScreen() {
  const counted = signal(4720.5);
  const expected = 4820.5;
  const variance = computed(() => Math.round((counted() - expected) * 100) / 100);
  const noteOpen = signal(false);
  const shiftClosed = signal(false);

  return (
    <Scroll class="flex-1" contentClass="p-6 gap-5">
      <View class="flex-row items-center justify-between gap-3">
        <View class="gap-0.5">
          <Text class="font-headline text-headline-lg text-on-surface">Reports & shift</Text>
          <Text class="font-body text-body-sm text-outline">
            {cashier.name} · {cashier.terminal} · opened {cashier.shiftStarted} · 25 Nov 2026
            {" · "}
            {syncState().dbReady ? syncState().pending + " writes queued" : "database offline"}
          </Text>
        </View>
        <View class="flex-row items-center gap-2">
          <Button label="Print Z-report" icon="print" />
          <Button
            label={shiftClosed() ? "Shift closed" : "Close shift"}
            icon={shiftClosed() ? "check" : "lock"}
            variant="primary"
            disabled={shiftClosed()}
            onPress={() => {
              void closeShift(Math.round(counted() * 100)).then(() => {
                shiftClosed.set(true);
              });
            }}
          />
        </View>
      </View>

      <View class="flex-row gap-3">
        <StatTile label="Gross sales" value={money(4820.5)} delta="+18.2%" positive hint="vs yesterday" icon="payments" />
        <StatTile label="Orders" value={count(186)} hint="42 dine-in · 96 takeaway · 48 delivery" icon="receipt_long" tone="info" />
        <StatTile label="Average ticket" value={money(25.92)} delta="+4.8%" positive hint="vs yesterday" icon="trending_up" tone="success" />
        <StatTile label="Refunds" value={money(64.4)} hint="2 invoices" icon="undo" tone="warn" />
      </View>

      <View class="flex-row gap-4">
        <View class="flex-col gap-3 rounded-md border border-outline-variant bg-surface-container-lowest p-4" style={{ flex: 1.1 }}>
          <CardHeader title="Drawer reconciliation" hint="Expected vs counted" />

          <View class="gap-2">
            <InfoRow label="Opening float" value={money(500)} />
            <InfoRow label="Cash sales" value={money(1840.2)} />
            <InfoRow label="Card settlements" value={money(2410.3)} />
            <InfoRow label="Wallet / QR" value={money(570)} />
            <InfoRow label="Refunds paid out" value={"−" + money(64.4)} />
            <View class="border-t border-outline-variant pt-2">
              <InfoRow label="Expected in drawer" value={money(expected)} strong />
            </View>
          </View>

          <View class="gap-2 rounded-md border border-outline-variant bg-surface-container-low p-3">
            <View class="flex-row items-center justify-between">
              <Text class="font-label text-label-md text-on-surface-variant">Counted cash</Text>
              <Text class="font-title text-title-lg tabular-nums text-on-surface">{money(counted())}</Text>
            </View>
            <View class="flex-row gap-1.5">
              <Each of={[4420.5, 4720.5, 4820.5, 5020.5]}>
                {(value) => (
                  <View
                    role="button"
                    onPress={() => counted.set(value())}
                    class={
                      "flex-1 items-center justify-center rounded-sm border py-1.5 " +
                      (counted() === value()
                        ? "border-primary-container bg-surface-variant"
                        : "border-outline-variant bg-surface-container-lowest")
                    }
                  >
                    <Text class="font-label text-label-md tabular-nums text-on-surface">
                      {money(value())}
                    </Text>
                  </View>
                )}
              </Each>
            </View>
            <View class="flex-row items-center justify-between border-t border-outline-variant pt-2">
              <Text class="font-label text-label-md text-on-surface-variant">Variance</Text>
              <StatusPill
                label={(variance() > 0 ? "+" : variance() < 0 ? "−" : "") + money(Math.abs(variance()))}
                tone={variance() === 0 ? "success" : variance() < 0 ? "error" : "warn"}
              />
            </View>
          </View>

          <View
            role="button"
            onPress={() => noteOpen.update((open) => !open)}
            class="flex-row items-center justify-between rounded border border-outline-variant bg-surface-container-low px-3 py-2"
          >
            <View class="flex-row items-center gap-2">
              <Icon name="edit_note" size={18} color="#6B5752" />
              <Text class="font-label text-label-md text-on-surface">
                {noteOpen() ? "Hide handover note" : "Add handover note"}
              </Text>
            </View>
            <Icon name={noteOpen() ? "expand_less" : "expand_more"} size={18} color="#6B5752" />
          </View>
          <If when={noteOpen()}>
            <View class="gap-1 rounded border border-outline-variant bg-surface-container-lowest p-3">
              <Eyebrow label="Shift note" />
              <Text class="font-body text-body-sm text-on-surface-variant">
                Oat milk ran out at 11:40 — two lattes swapped to whole milk with customer
                consent. Bakery case needs a refill before the evening rush.
              </Text>
            </View>
          </If>
        </View>

        <View class="flex-col gap-4" style={{ flex: 1.5 }}>
          <View class="gap-3 rounded-md border border-outline-variant bg-surface-container-lowest p-4">
            <CardHeader title="Sales by hour" hint="Peak at 12:00" />
            <BarsChart
              data={hourlySales.slice(8, 20).map((value, index) => ({
                label: String(8 + index),
                value,
              }))}
              height={130}
              highlight={4}
            />
          </View>

          <View class="flex-row gap-4">
            <View class="flex-1 gap-3 rounded-md border border-outline-variant bg-surface-container-lowest p-4">
              <CardHeader title="Category mix" hint="Share of sales" />
              <Each of={categoryMix}>
                {(row) => (
                  <ShareRow label={row().label} value={money(row().value)} ratio={row().ratio} />
                )}
              </Each>
            </View>

            <View class="flex-1 gap-2 rounded-md border border-outline-variant bg-surface-container-lowest p-4">
              <CardHeader title="Payment split" hint="By method" />
              <Each of={paymentMix}>
                {(slice) => (
                  <View class="flex-row items-center justify-between border-t border-outline-variant/60 pt-2">
                    <View class="flex-row items-center gap-2">
                      <View class="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice().color }} />
                      <Text class="font-body text-body-md text-on-surface">{slice().label}</Text>
                    </View>
                    <Text class="font-label text-label-md tabular-nums text-on-surface">
                      {slice().value}%
                    </Text>
                  </View>
                )}
              </Each>
              <View class="flex-row items-center justify-between border-t border-outline-variant pt-2">
                <Text class="font-body text-body-sm text-outline">Cash count variance</Text>
                <Text class="font-label text-label-md tabular-nums text-error">
                  {variance() === 0 ? money(0) : (variance() < 0 ? "−" : "+") + money(Math.abs(variance()))}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View class="flex-row gap-4">
        <View class="flex-1 gap-2 rounded-md border border-outline-variant bg-surface-container-lowest p-4">
          <CardHeader title="Top sellers" hint="Quantity today">
            <Button label="All reports" size="sm" variant="ghost" iconRight="arrow_forward" onPress={() => navigate("sales")} />
          </CardHeader>
          <Each of={topProducts}>
            {(item, index) => (
              <View class="flex-row items-center justify-between border-t border-outline-variant/60 pt-2">
                <View class="flex-row items-center gap-2.5">
                  <Text class="w-4 font-label text-label-md tabular-nums text-outline">
                    {index() + 1}
                  </Text>
                  <Text class="font-body text-body-md text-on-surface">{item().name}</Text>
                </View>
                <View class="flex-row items-center gap-4">
                  <Text class="font-body text-body-sm tabular-nums text-outline">{item().qty} sold</Text>
                  <Text class="w-16 text-right font-label text-label-md tabular-nums text-on-surface">
                    {money(item().revenue)}
                  </Text>
                </View>
              </View>
            )}
          </Each>
        </View>

        <View class="flex-1 gap-3 rounded-md border border-outline-variant bg-surface-container-low p-4">
          <CardHeader title="Before you close" hint="Three checks" />
          <View class="flex-row items-center gap-2">
            <Icon name="check_circle" size={18} color="#3F5E27" />
            <Text class="font-body text-body-md text-on-surface">Every invoice for the shift is settled</Text>
          </View>
          <View class="flex-row items-center gap-2">
            <Icon name="check_circle" size={18} color="#3F5E27" />
            <Text class="font-body text-body-md text-on-surface">Card batch 88213 reconciled to the bank</Text>
          </View>
          <View class="flex-row items-center gap-2">
            <Icon name={variance() === 0 ? "check_circle" : "error"} size={18} color={variance() === 0 ? "#3F5E27" : "#BA1A1A"} />
            <Text class="font-body text-body-md text-on-surface">
              {variance() === 0
                ? "Drawer counts match the expected total"
                : "Drawer is off by " + money(Math.abs(variance())) + " — add a note before closing"}
            </Text>
          </View>
          <View class="flex-1" />
          <Button
            label={shiftClosed() ? "Shift closed · Z-report queued" : "Close shift & print Z-report"}
            variant={shiftClosed() ? "secondary" : "primary"}
            icon={shiftClosed() ? "check" : "lock"}
            disabled={shiftClosed()}
            onPress={() => {
              void closeShift(Math.round(counted() * 100)).then(() => {
                shiftClosed.set(true);
              });
            }}
          />
        </View>
      </View>
    </Scroll>
  );
}
