import { signal, Text, View } from "nsh";
import { Icon } from "../../ui/Icon";
import { Button } from "../../ui/Button";
import { Screen } from "../../ui/Screen";
import { CardHeader, Eyebrow, InfoRow, StatTile } from "../../ui/Card";
import { ShareRow } from "../../ui/Charts";
import { Chip } from "../../ui/Badge";
import { accounts, pnl, type Account } from "../../data/ops";
import { initDb, loadAccounts, loadTaxTotals } from "../../db/repo";
import { pnlFromAccounts } from "../../accounting";
import { money } from "../../format";

const periods = ["This month", "Last month", "Quarter", "Year"] as const;

export function TaxScreen() {
  const period = signal<(typeof periods)[number]>("This month");
  const books = signal<Account[]>(accounts);
  const tax = signal({ collected: pnl.taxCollected, paid: pnl.taxPaid });

  void initDb()
    .then((ready) => (ready ? Promise.all([loadAccounts(), loadTaxTotals()]) : undefined))
    .then((result) => {
      if (!result) return;
      const [rows, totals] = result;
      if (rows.length > 0) {
        books.set(
          rows.map((row) => ({
            code: row.code,
            name: row.name,
            type: row.type as Account["type"],
            balance: Number(row.balance_cents) / 100,
          })),
        );
      }
      tax.set({ collected: totals.collectedCents / 100, paid: totals.paidCents / 100 });
    })
    .catch(() => undefined);

  const summary = () => pnlFromAccounts(books());
  const taxDue = () => tax().collected - tax().paid;
  const margin = (value: number) =>
    summary().revenue > 0 ? ((value / summary().revenue) * 100).toFixed(1) + "%" : "0.0%";

  return (
    <Screen
      scroll
      title="P&L and tax"
      subtitle="Profit & loss statement and the GST position for the period"
      actions={
        <>
          <Button label="Export" icon="download" />
          <Button label="File tax return" icon="gavel" variant="primary" />
        </>
      }
    >
      <View class="flex-row items-center gap-2">
        <Each of={periods}>
          {(name) => (
            <Chip label={name()} selected={period() === name()} onPress={() => period.set(name())} />
          )}
        </Each>
        <View class="flex-1" />
        <Text class="font-body text-body-sm text-outline">
          Books close on 30 November · GST return due 18 December
        </Text>
      </View>

      <View class="flex-row gap-3">
        <StatTile label="Revenue" value={money(summary().revenue)} delta="+14.2%" positive hint="vs October" icon="trending_up" />
        <StatTile label="Gross profit" value={money(summary().gross)} hint={margin(summary().gross) + " margin"} icon="percent" tone="success" />
        <StatTile label="Operating costs" value={money(summary().operating)} hint="rent, people, utilities" icon="receipt" tone="warn" />
        <StatTile label="Net profit" value={money(summary().net)} delta="+9.6%" positive hint="before drawings" icon="savings" tone="info" />
      </View>

      <View class="flex-row gap-4">
        <View class="flex-col gap-3 rounded-md border border-outline-variant bg-surface-container-lowest p-4" style={{ flex: 1.5 }}>
          <CardHeader title="Profit & loss" hint={period()} />
          <View class="gap-2">
            <View class="flex-row items-center justify-between border-b border-outline-variant pb-2">
              <Text class="font-label text-label-md uppercase tracking-label text-outline">Revenue</Text>
              <Text class="font-label text-label-md tabular-nums text-on-surface">{money(summary().revenue)}</Text>
            </View>
            <Each of={summary().lines.slice(0, 2)}>
              {(line) => (
                <View class="flex-row items-center justify-between pl-3">
                  <Text class="font-body text-body-md text-on-surface-variant">{line().label}</Text>
                  <Text class="font-body text-body-md tabular-nums text-on-surface">{money(line().value)}</Text>
                </View>
              )}
            </Each>

            <View class="flex-row items-center justify-between border-y border-outline-variant py-2">
              <Text class="font-label text-label-md uppercase tracking-label text-outline">Cost of goods sold</Text>
              <Text class="font-label text-label-md tabular-nums text-on-surface">−{money(summary().cogs)}</Text>
            </View>
            <View class="flex-row items-center justify-between rounded bg-surface-container-low px-3 py-2">
              <Text class="font-title text-title-md text-on-surface">Gross profit</Text>
              <Text class="font-title text-title-md tabular-nums text-on-surface">{money(summary().gross)}</Text>
            </View>

            <View class="flex-row items-center justify-between border-b border-outline-variant pb-2 pt-1">
              <Text class="font-label text-label-md uppercase tracking-label text-outline">Operating expenses</Text>
              <Text class="font-label text-label-md tabular-nums text-on-surface">
                −{money(summary().operating)}
              </Text>
            </View>
            <Each of={summary().lines.slice(3)}>
              {(line) => (
                <View class="flex-row items-center justify-between pl-3">
                  <Text class="font-body text-body-md text-on-surface-variant">{line().label}</Text>
                  <Text class="font-body text-body-md tabular-nums text-on-surface">{money(line().value)}</Text>
                </View>
              )}
            </Each>

            <View class="flex-row items-center justify-between border-t-2 border-on-surface pt-3">
              <Text class="font-headline text-headline-md text-on-surface">Net profit</Text>
              <Text class="font-headline text-headline-md tabular-nums text-on-surface">{money(summary().net)}</Text>
            </View>
            <Text class="font-body text-body-sm text-outline">
              Net margin {margin(summary().net)} · owner drawings are not deducted here.
            </Text>
          </View>
        </View>

        <View class="flex-1 gap-3">
          <View class="gap-2.5 rounded-md border border-outline-variant bg-surface-container-lowest p-4">
            <CardHeader title="GST position" hint="Collected vs paid" />
            <InfoRow label="GST collected on sales" value={money(tax().collected)} />
            <InfoRow label="GST paid on purchases" value={money(tax().paid)} />
            <View class="border-t border-outline-variant pt-2">
              <InfoRow label="Net GST due" value={money(taxDue())} strong />
            </View>
            <View class="flex-row items-center justify-between rounded border border-outline-variant bg-surface-container-low px-3 py-2">
              <View class="gap-0">
                <Text class="font-label text-label-md text-on-surface">Return status</Text>
                <Text class="font-body text-body-sm text-outline">Filed monthly · FBR</Text>
              </View>
              <Text class="font-label text-label-md text-amber">Not filed</Text>
            </View>
          </View>

          <View class="gap-2.5 rounded-md border border-outline-variant bg-surface-container-lowest p-4">
            <CardHeader title="Where the money goes" hint="Share of revenue" />
            <Each of={summary().lines}>
              {(line) => (
                <ShareRow label={line().label} value={money(line().value)} ratio={line().ratio} />
              )}
            </Each>
          </View>

          <View class="gap-2 rounded-md border border-outline-variant bg-surface-container-low p-4">
            <Eyebrow label="Before you file" />
            <View class="flex-row items-center gap-2">
              <Icon name="check_circle" size={16} color="#3F5E27" />
              <Text class="font-body text-body-sm text-on-surface">Every invoice has a tax code</Text>
            </View>
            <View class="flex-row items-center gap-2">
              <Icon name="check_circle" size={16} color="#3F5E27" />
              <Text class="font-body text-body-sm text-on-surface">Supplier invoices are matched 3-way</Text>
            </View>
            <View class="flex-row items-center gap-2">
              <Icon name="error" size={16} color="#7E5700" />
              <Text class="font-body text-body-sm text-on-surface">1 stock adjustment still in draft</Text>
            </View>
          </View>
        </View>
      </View>
    </Screen>
  );
}
