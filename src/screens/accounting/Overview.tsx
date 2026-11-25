import { signal, Text, View } from "nsh";
import { Button } from "../../ui/Button";
import { Screen } from "../../ui/Screen";
import { CardHeader, Eyebrow, InfoRow, StatTile } from "../../ui/Card";
import { Donut, ShareRow, ProgressBar } from "../../ui/Charts";
import { StatusPill } from "../../ui/Badge";
import { TableWrap, Head, HeadCell, Row, Cell, TextCell } from "../../ui/Table";
import { navigate, switchApp, paidBills, recentBills, recentJournal } from "../../store";
import {
  accounts,
  bankLines,
  journal,
  payables,
  type Account,
  type JournalEntry,
} from "../../data/ops";
import {
  initDb,
  loadAccounts,
  loadBankLines,
  loadJournal,
  loadVendorBills,
} from "../../db/repo";
import { pnlFromAccounts } from "../../accounting";
import { billFromFixture, billFromRow, openBills, type BillView } from "../../bills";
import { journalFromRow, mergeJournal } from "../../journal";
import { money } from "../../format";

export function AccountingOverviewScreen() {
  const books = signal<Account[]>(accounts);
  const bills = signal<BillView[]>([]);
  const entries = signal<JournalEntry[]>([]);
  const bank = signal({
    matched: bankLines.filter((line) => line.matched).length,
    total: bankLines.length,
  });

  void initDb()
    .then((ready) =>
      ready
        ? Promise.all([loadAccounts(), loadVendorBills(), loadJournal(), loadBankLines()])
        : undefined,
    )
    .then((result) => {
      if (!result) return;
      const [accountRows, billRows, journalRows, bankRows] = result;
      if (accountRows.length > 0) {
        books.set(
          accountRows.map((row) => ({
            code: row.code,
            name: row.name,
            type: row.type as Account["type"],
            balance: Number(row.balance_cents) / 100,
          })),
        );
      }
      if (billRows.length > 0) bills.set(billRows.map(billFromRow));
      if (journalRows.length > 0) entries.set(journalRows.map(journalFromRow));
      if (bankRows.length > 0) {
        bank.set({
          matched: bankRows.filter((row) => Number(row.matched) === 1).length,
          total: bankRows.length,
        });
      }
    })
    .catch(() => undefined);

  const summary = () => pnlFromAccounts(books());
  const cash = () => books().filter((a) => a.code.startsWith("10")).reduce((sum, a) => sum + a.balance, 0);
  const margin = () =>
    summary().revenue > 0 ? ((summary().gross / summary().revenue) * 100).toFixed(1) + "%" : "0.0%";
  const netShare = () =>
    summary().revenue > 0 ? Math.round((summary().net / summary().revenue) * 100) : 0;

  /** Live bills, then session receipts, then the design fixtures. */
  const billRows = () => {
    const merged: BillView[] = [];
    const seen = new Set<string>();
    const settled = paidBills();
    for (const bill of [
      ...bills(),
      ...recentBills().map(billFromRow),
      ...payables.map(billFromFixture),
    ]) {
      if (seen.has(bill.key)) continue;
      seen.add(bill.key);
      merged.push(settled[bill.key] ? { ...bill, status: "Paid" } : bill);
    }
    return openBills(merged);
  };
  const dueBills = () =>
    billRows().filter((bill) => bill.status === "Due" || bill.status === "Overdue");
  const due = () => dueBills().reduce((sum, bill) => sum + bill.amount, 0);
  const journalRows = () =>
    mergeJournal(entries(), recentJournal().map(journalFromRow), journal).slice(0, 4);

  return (
    <Screen
      scroll
      title="Accounting overview"
      subtitle="Gulberg Café · November 2026 · books close on the 30th"
      actions={
        <>
          <Button label="Export pack" icon="download" />
          <Button label="New journal entry" icon="add" variant="primary" onPress={() => navigate("journal")} />
        </>
      }
    >
      <View class="flex-row gap-3">
        <StatTile label="Revenue MTD" value={money(summary().revenue)} delta="+14.2%" positive hint="vs October" icon="trending_up" />
        <StatTile label="Gross margin" value={margin()} delta="+1.8 pts" positive hint="food & beverage" icon="percent" tone="success" />
        <StatTile label="Net profit" value={money(summary().net)} delta="+9.6%" positive hint="after tax" icon="savings" tone="info" />
        <StatTile label="Cash & bank" value={money(cash())} hint="3 accounts" icon="account_balance" tone="warn" />
      </View>

      <View class="flex-row gap-4">
        <View class="flex-col gap-3 rounded-md border border-outline-variant bg-surface-container-lowest p-4" style={{ flex: 1.4 }}>
          <CardHeader title="Profit & loss" hint="Month to date">
            <Button label="Full statement" size="sm" variant="ghost" iconRight="arrow_forward" onPress={() => navigate("tax")} />
          </CardHeader>

          <View class="flex-row gap-4">
            <Donut
              segments={[
                { value: summary().cogs, color: "#B44326" },
                { value: summary().operating, color: "#7E5700" },
                { value: summary().net, color: "#3F5E27" },
              ]}
              size={140}
              thickness={16}
            >
              <View class="items-center">
                <Text class="font-body text-body-sm text-outline">Net</Text>
                <Text class="font-title text-title-md tabular-nums text-on-surface">
                  {netShare()}%
                </Text>
              </View>
            </Donut>
            <View class="flex-1 gap-2 justify-center">
              <View class="flex-row items-center justify-between">
                <View class="flex-row items-center gap-2">
                  <View class="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#3F5E27" }} />
                  <Text class="font-body text-body-md text-on-surface">Net profit</Text>
                </View>
                <Text class="font-label text-label-md tabular-nums text-on-surface">{money(summary().net)}</Text>
              </View>
              <View class="flex-row items-center justify-between">
                <View class="flex-row items-center gap-2">
                  <View class="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#B44326" }} />
                  <Text class="font-body text-body-md text-on-surface">Cost of goods</Text>
                </View>
                <Text class="font-label text-label-md tabular-nums text-on-surface">{money(summary().cogs)}</Text>
              </View>
              <View class="flex-row items-center justify-between">
                <View class="flex-row items-center gap-2">
                  <View class="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#7E5700" }} />
                  <Text class="font-body text-body-md text-on-surface">Operating costs</Text>
                </View>
                <Text class="font-label text-label-md tabular-nums text-on-surface">{money(summary().operating)}</Text>
              </View>
              <View class="border-t border-outline-variant pt-2">
                <InfoRow label="Revenue" value={money(summary().revenue)} strong />
              </View>
            </View>
          </View>

          <View class="gap-2.5 border-t border-outline-variant pt-3">
            <Each of={summary().lines.slice(2, 6)}>
              {(line) => (
                <ShareRow label={line().label} value={money(line().value)} ratio={line().ratio} />
              )}
            </Each>
          </View>
        </View>

        <View class="flex-col gap-3" style={{ flex: 1 }}>
          <View class="gap-2.5 rounded-md border border-outline-variant bg-surface-container-lowest p-4">
            <CardHeader title="Cash & bank" hint="Live balances" />
            <Each of={books().filter((account) => account.code.startsWith("10"))}>
              {(account) => (
                <View class="flex-row items-center justify-between gap-2 border-t border-outline-variant/60 pt-2">
                  <View class="gap-0">
                    <Text class="font-label text-label-md text-on-surface">{account().name}</Text>
                    <Text class="font-body text-body-sm tabular-nums text-outline">{account().code}</Text>
                  </View>
                  <Text class="font-label text-label-md tabular-nums text-on-surface">{money(account().balance)}</Text>
                </View>
              )}
            </Each>
          </View>

          <View class="gap-2.5 rounded-md border border-outline-variant bg-surface-container-lowest p-4">
            <CardHeader title="Due this week" hint={"Payables " + money(due())} />
            <Each of={dueBills().slice(0, 3)}>
              {(bill) => (
                <View class="flex-row items-center justify-between gap-2 border-t border-outline-variant/60 pt-2">
                  <View class="gap-0 min-w-0">
                    <Text class="font-label text-label-md text-on-surface truncate">{bill().vendor}</Text>
                    <Text class="font-body text-body-sm text-outline">Due {bill().due}</Text>
                  </View>
                  <View class="items-end gap-1">
                    <Text class="font-label text-label-md tabular-nums text-on-surface">{money(bill().amount)}</Text>
                    <StatusPill label={bill().status} tone={bill().status === "Overdue" ? "error" : "warn"} />
                  </View>
                </View>
              )}
            </Each>
            <Button label="Open payables" size="sm" variant="ghost" iconRight="arrow_forward" onPress={() => navigate("payables")} />
          </View>

          <View class="flex-1 gap-2 rounded-md border border-outline-variant bg-surface-container-low p-4">
            <Eyebrow label="Close checklist" />
            <View class="flex-row items-center justify-between">
              <Text class="font-body text-body-sm text-on-surface">Bank reconciled</Text>
              <Text class="font-label text-label-sm text-secondary">
                {bank().matched + " of " + bank().total}
              </Text>
            </View>
            <ProgressBar
              value={bank().matched / Math.max(1, bank().total)}
              height={5}
              color="#3F5E27"
            />
            <View class="flex-row items-center justify-between">
              <Text class="font-body text-body-sm text-on-surface">Receipts filed</Text>
              <Text class="font-label text-label-sm text-secondary">31 of 31</Text>
            </View>
            <ProgressBar value={1} height={5} color="#3F5E27" />
            <View class="flex-row items-center justify-between">
              <Text class="font-body text-body-sm text-on-surface">Stock adjustments posted</Text>
              <Text class="font-label text-label-sm text-amber">3 of 4</Text>
            </View>
            <ProgressBar value={0.75} height={5} color="#B44326" />
          </View>
        </View>
      </View>

      <View class="flex-row gap-4">
        <TableWrap class="flex-1">
          <View class="flex-row items-center justify-between px-4 py-3">
            <CardHeader title="Recent journal" hint="Auto-posted from the register" />
            <Button label="Open journal" size="sm" variant="ghost" onPress={() => navigate("journal")} />
          </View>
          <Head>
            <HeadCell label="Ref" flex={1.4} />
            <HeadCell label="Description" flex={2.6} />
            <HeadCell label="Amount" flex={1} align="right" />
            <HeadCell label="Status" flex={1} />
          </Head>
          <Each of={journalRows()}>
            {(entry) => (
              <Row>
                <TextCell text={entry().ref} flex={1.4} mono muted />
                <Cell flex={2.6}>
                  <Text class="font-body text-body-md text-on-surface truncate">{entry().description}</Text>
                </Cell>
                <TextCell text={money(entry().amount)} flex={1} align="right" strong />
                <Cell flex={1}>
                  <StatusPill label={entry().status} tone={entry().status === "Posted" ? "success" : "warn"} />
                </Cell>
              </Row>
            )}
          </Each>
        </TableWrap>

        <View class="gap-2 rounded-md border border-outline-variant bg-surface-container-low p-4" style={{ width: 340 }}>
          <CardHeader title="Also in the books" hint="Jump to a task" />
          <Button label="Chart of accounts" icon="account_tree" onPress={() => navigate("accounts")} />
          <Button label="Expenses" icon="receipt" onPress={() => navigate("expenses")} />
          <Button label="Bank reconciliation" icon="account_balance" onPress={() => navigate("reconciliation")} />
          <Button label="P&L & tax" icon="calculate" variant="soft" onPress={() => navigate("tax")} />
          <View class="flex-row items-center gap-2 pt-1">
            <Text class="flex-1 font-body text-body-sm text-outline">Inventory value</Text>
            <Text class="font-label text-label-md tabular-nums text-on-surface">{money(18420.6)}</Text>
          </View>
          <Button label="Open inventory" size="sm" variant="ghost" iconRight="arrow_forward" onPress={() => switchApp("inventory")} />
        </View>
      </View>
    </Screen>
  );
}
