import { Scroll, signal, Text, View } from "nsh";
import { Icon } from "../../ui/Icon";
import { Button } from "../../ui/Button";
import { Chip, StatusPill } from "../../ui/Badge";
import { Screen } from "../../ui/Screen";
import { CardHeader, InfoRow, StatTile } from "../../ui/Card";
import { ShareRow } from "../../ui/Charts";
import { Field, TextBox } from "../../ui/Field";
import { Drawer } from "../../ui/Drawer";
import { TableWrap, Head, HeadCell, Row, Cell, TextCell } from "../../ui/Table";
import { recordExpensePosted, recentExpenses } from "../../store";
import { expenses, type Expense } from "../../data/ops";
import {
  initDb,
  loadExpenses,
  nextJournalNo,
  recordExpense,
  type ExpenseRow,
} from "../../db/repo";
import { money } from "../../format";

type Method = Expense["method"];
type Status = Expense["status"];

const methods: Method[] = ["Bank", "Cash", "Card"];

const categories = [
  { name: "Inventory", account: "1200" },
  { name: "Packaging", account: "1200" },
  { name: "Utilities", account: "5300" },
  { name: "Supplies", account: "5300" },
  { name: "Rent", account: "5100" },
  { name: "Salaries", account: "5200" },
  { name: "Waste", account: "5400" },
] as const;

type CategoryName = (typeof categories)[number]["name"];

const accountNames: Record<string, string> = {
  "1000": "Cash on hand",
  "1010": "Bank · Meezan current",
  "1020": "Card settlements receivable",
  "1200": "Inventory",
  "5100": "Rent",
  "5200": "Salaries & wages",
  "5300": "Utilities",
  "5400": "Waste & spoilage",
};

const tenders: Record<Method, { code: string; name: string }> = {
  Bank: { code: "1010", name: accountNames["1010"] },
  Cash: { code: "1000", name: accountNames["1000"] },
  Card: { code: "1020", name: accountNames["1020"] },
};

interface ExpenseView {
  key: string;
  date: string;
  vendor: string;
  category: string;
  account: string;
  amount: number;
  method: Method;
  status: Status;
}

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** `Nov 25` from a stored expense date. */
function dayLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return months[date.getMonth()] + " " + date.getDate();
}

function keyOf(vendor: string, date: string, amount: number, account: string): string {
  return vendor + "|" + date + "|" + amount.toFixed(2) + "|" + account;
}

function asMethod(value: string): Method {
  return value === "Cash" || value === "Card" ? value : "Bank";
}

function fromRow(row: ExpenseRow): ExpenseView {
  const date = dayLabel(row.expense_date);
  const account = row.account_code;
  const amount = Number(row.amount_cents) / 100;
  return {
    key: keyOf(row.vendor, date, amount, account),
    date,
    vendor: row.vendor,
    category: row.category,
    account,
    amount,
    method: asMethod(row.method),
    status: row.status === "Pending" ? "Pending" : "Paid",
  };
}

function accountFor(category: CategoryName): string {
  return categories.find((entry) => entry.name === category)?.account ?? "5300";
}

export function ExpensesScreen() {
  const persisted = signal<ExpenseView[]>([]);
  const formOpen = signal(false);
  const vendor = signal("");
  const amountText = signal("");
  const category = signal<CategoryName>("Inventory");
  const method = signal<Method>("Bank");
  const note = signal("");
  const formError = signal("");
  const notice = signal("");

  void initDb()
    .then((ready) => (ready ? loadExpenses() : undefined))
    .then((rows) => {
      if (!rows || rows.length === 0) return;
      persisted.set(rows.map(fromRow));
    })
    .catch(() => undefined);

  /** Session postings first, then sqlite, then the design fixtures. */
  const rows = () => {
    const merged: ExpenseView[] = [];
    const seen = new Set<string>();
    const fixtures: ExpenseView[] = expenses.map((expense) => ({
      key: keyOf(expense.vendor, expense.date, expense.amount, expense.account),
      date: expense.date,
      vendor: expense.vendor,
      category: expense.category,
      account: expense.account,
      amount: expense.amount,
      method: expense.method,
      status: expense.status,
    }));
    for (const row of [...recentExpenses().map(fromRow), ...persisted(), ...fixtures]) {
      if (seen.has(row.key)) continue;
      seen.add(row.key);
      merged.push(row);
    }
    return merged;
  };

  const total = () => rows().reduce((sum, row) => sum + row.amount, 0);
  const pending = () => rows().filter((row) => row.status === "Pending");
  const stockPurchases = () =>
    rows().filter((row) => row.account === "1200").reduce((sum, row) => sum + row.amount, 0);

  const byCategory = () => {
    const map = new Map<string, number>();
    for (const row of rows()) {
      map.set(row.category, (map.get(row.category) ?? 0) + row.amount);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  };

  const openForm = () => {
    vendor.set("");
    amountText.set("");
    category.set("Inventory");
    method.set("Bank");
    note.set("");
    formError.set("");
    notice.set("");
    formOpen.set(true);
  };

  const post = () => {
    const vendorName = vendor().trim();
    const amount = Math.round(Number(amountText().replace(/[^0-9.]/g, "")) * 100);
    if (vendorName === "") {
      formError.set("Add a vendor.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      formError.set("Enter an amount greater than zero.");
      return;
    }

    const account = accountFor(category());
    const tender = tenders[method()];
    const entryNo = nextJournalNo();
    const spentAt = new Date().toISOString();
    const id = "expense_" + Date.now().toString(36);
    const row: ExpenseRow = {
      id,
      expense_date: spentAt,
      vendor: vendorName,
      category: category(),
      account_code: account,
      amount_cents: amount,
      method: method(),
      status: "Paid",
      entry_no: entryNo,
      notes: note(),
    };

    recordExpensePosted(row, {
      ref: entryNo,
      description: "Expense · " + vendorName,
      posted_at: spentAt,
      debit: account + " " + (accountNames[account] ?? "Expense"),
      credit: tender.code + " " + tender.name,
      amount_cents: amount,
      status: "Posted",
    });

    void recordExpense({
      id,
      vendor: vendorName,
      category: category(),
      accountCode: account,
      amountCents: amount,
      method: method(),
      notes: note(),
      spentAt,
      entryNo,
    }).catch((error) => {
      console.log("expense not written to sqlite: " + (error?.message ?? error));
    });

    formOpen.set(false);
    notice.set("Expense posted · " + money(amount / 100) + " · " + entryNo);
  };

  return (
    <Screen
      scroll={false}
      title="Expenses"
      subtitle="Supplier bills and running costs, coded to the ledger"
      actions={
        <>
          <Button label="Scan receipt" icon="document_scanner" />
          <Button label="New expense" icon="add" variant="primary" onPress={openForm} />
        </>
      }
    >
      <View class="flex-row gap-3">
        <StatTile label="Spent this month" value={money(total())} delta="+6.2%" positive={false} hint="vs October" icon="receipt" tone="warn" />
        <StatTile
          label="Pending bills"
          value={String(pending().length)}
          hint={pending()[0]?.vendor ?? "nothing waiting"}
          icon="pending_actions"
          tone="info"
        />
        <StatTile label="Inventory purchases" value={money(stockPurchases())} hint="stock, not COGS" icon="inventory_2" tone="success" />
        <StatTile label="Receipts filed" value="31 of 31" hint="nothing missing" icon="verified" />
      </View>

      <If when={notice() !== ""}>
        <View class="flex-row items-center gap-2 rounded border border-secondary/30 bg-secondary-container px-3 py-2">
          <Icon name="check_circle" size={16} color="#3F5E27" />
          <Text class="font-body text-body-sm text-on-secondary-container">{notice()}</Text>
        </View>
      </If>

      <View class="flex-row gap-4 min-h-0 flex-1">
        <TableWrap class="flex-1 min-h-0">
          <Scroll class="flex-1">
            <Head>
              <HeadCell label="Date" flex={0.8} />
              <HeadCell label="Vendor" flex={2} />
              <HeadCell label="Category" flex={1.3} />
              <HeadCell label="Account" flex={0.9} />
              <HeadCell label="Method" flex={1} />
              <HeadCell label="Amount" flex={1} align="right" />
              <HeadCell label="Status" flex={0.9} />
            </Head>
            <Each of={rows()}>
              {(expense) => (
                <Row>
                  <TextCell text={expense().date} flex={0.8} muted />
                  <Cell flex={2}>
                    <View class="flex-row items-center gap-2 min-w-0">
                      <View class="h-7 w-7 items-center justify-center rounded-sm bg-surface-container">
                        <Icon name="receipt" size={14} />
                      </View>
                      <Text class="font-label text-label-md text-on-surface truncate">{expense().vendor}</Text>
                    </View>
                  </Cell>
                  <Cell flex={1.3}>
                    <Text class="font-body text-body-md text-on-surface-variant">{expense().category}</Text>
                  </Cell>
                  <TextCell text={expense().account} flex={0.9} mono muted />
                  <Cell flex={1}>
                    <Text class="font-body text-body-md text-on-surface-variant">{expense().method}</Text>
                  </Cell>
                  <TextCell text={money(expense().amount)} flex={1} align="right" strong />
                  <Cell flex={0.9}>
                    <StatusPill label={expense().status} tone={expense().status === "Paid" ? "success" : "warn"} />
                  </Cell>
                </Row>
              )}
            </Each>
            <View class="flex-row items-center justify-between border-t border-outline-variant bg-surface-container-low px-4 py-2.5">
              <Text class="font-label text-label-md uppercase tracking-label text-outline">Total visible</Text>
              <Text class="font-title text-title-md tabular-nums text-on-surface">{money(total())}</Text>
            </View>
          </Scroll>
        </TableWrap>

        <View class="gap-3" style={{ width: 330 }}>
          <View class="gap-3 rounded-md border border-outline-variant bg-surface-container-lowest p-4">
            <CardHeader title="Where it goes" hint="By category" />
            <Each of={byCategory()}>
              {(row) => (
                <ShareRow
                  label={row()[0]}
                  value={money(row()[1])}
                  ratio={row()[1] / Math.max(1, total())}
                />
              )}
            </Each>
          </View>

          <View class="gap-2 rounded-md border border-outline-variant bg-surface-container-low p-4">
            <Text class="font-title text-title-md text-on-surface">Coding rule</Text>
            <Text class="font-body text-body-sm text-on-surface-variant">
              Inventory purchases go to stock, not straight to cost of goods. The
              expense lands when the item is sold.
            </Text>
            <Button label="Review uncoded" size="sm" variant="soft" icon="tune" />
          </View>
        </View>
      </View>

      <If when={formOpen()}>
        <Drawer
          title="Record an expense"
          subtitle="Coded to the ledger and posted immediately"
          width={480}
          onClose={() => formOpen.set(false)}
        >
          <View class="flex-1 min-h-0">
            <Scroll class="flex-1">
              <View class="gap-4 p-4">
                <Field label="Vendor">
                  <TextBox value={vendor()} onChange={(value) => vendor.set(value)} placeholder="Vendor name" />
                </Field>

                <View class="flex-row gap-3">
                  <Field label="Amount" class="flex-1">
                    <TextBox value={amountText()} onChange={(value) => amountText.set(value)} placeholder="Amount" />
                  </Field>
                  <Field label="Date" class="flex-1">
                    <View class="flex-row items-center justify-between rounded border border-outline-variant bg-surface-container-low px-3 py-2.5">
                      <Text class="font-body text-body-md text-on-surface">{dayLabel(new Date().toISOString())}</Text>
                      <Icon name="calendar_today" size={16} color="#6B5752" />
                    </View>
                  </Field>
                </View>

                <Field label="Category">
                  <View class="flex-row flex-wrap gap-2">
                    <Each of={categories}>
                      {(entry) => (
                        <Chip
                          label={entry().name}
                          selected={category() === entry().name}
                          a11yLabel={"Category " + entry().name}
                          onPress={() => category.set(entry().name)}
                        />
                      )}
                    </Each>
                  </View>
                </Field>

                <Field label="Paid from">
                  <View class="flex-row gap-2">
                    <Each of={methods}>
                      {(name) => (
                        <Chip
                          label={name()}
                          selected={method() === name()}
                          a11yLabel={"Method " + name()}
                          onPress={() => method.set(name())}
                        />
                      )}
                    </Each>
                  </View>
                </Field>

                <Field label="Note">
                  <TextBox value={note()} onChange={(value) => note.set(value)} placeholder="What was it for?" />
                </Field>

                <View class="gap-2.5 rounded-md border border-outline-variant bg-surface-container-low p-3">
                  <CardHeader title="Journal preview" hint="Posts on save" />
                  <InfoRow
                    label="Debit"
                    value={accountFor(category()) + " " + (accountNames[accountFor(category())] ?? "Expense")}
                  />
                  <InfoRow label="Credit" value={tenders[method()].code + " " + tenders[method()].name} />
                </View>

                <If when={formError() !== ""}>
                  <Text class="font-body text-body-sm text-error">{formError()}</Text>
                </If>
              </View>
            </Scroll>

            <View class="flex-row gap-2 border-t border-outline-variant p-4">
              <Button label="Cancel" grow onPress={() => formOpen.set(false)} />
              <Button
                label="Post expense"
                a11yLabel="Post expense"
                icon="check"
                variant="primary"
                grow
                onPress={post}
              />
            </View>
          </View>
        </Drawer>
      </If>
    </Screen>
  );
}
