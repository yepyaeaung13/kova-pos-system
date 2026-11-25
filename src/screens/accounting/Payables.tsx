import { Scroll, signal, Text, View } from "nsh";
import { Icon } from "../../ui/Icon";
import { Button } from "../../ui/Button";
import { ApprovalModal } from "../../ui/ApprovalModal";
import { Drawer } from "../../ui/Drawer";
import { Screen } from "../../ui/Screen";
import { CardHeader, InfoRow, StatTile } from "../../ui/Card";
import { StatusPill } from "../../ui/Badge";
import { ProgressBar } from "../../ui/Charts";
import { TableWrap, Head, HeadCell, Row, Cell, TextCell } from "../../ui/Table";
import { paidBills, recordBillPayment, recentBills } from "../../store";
import { payables } from "../../data/ops";
import {
  loadVendorBills,
  nextJournalNo,
  payVendorBill,
  payVendorBills,
} from "../../db/repo";
import { billFromFixture, billFromRow, type BillView } from "../../bills";
import { money } from "../../format";

export function PayablesScreen() {
  const persisted = signal<BillView[]>([]);
  const paying = signal<BillView | null>(null);
  const runOpen = signal(false);
  const selected = signal<Record<string, boolean>>({});
  const approval = signal(false);
  const notice = signal("");
  void loadVendorBills()
    .then((rows) => {
      if (rows.length === 0) return;
      persisted.set(rows.map(billFromRow));
    })
    .catch(() => undefined);

  /** Session receipts first, then sqlite bills, then the design fixtures. */
  const rows = () => {
    const merged: BillView[] = [];
    const seen = new Set<string>();
    const settled = paidBills();
    const fixtures: BillView[] = payables.map(billFromFixture);
    for (const bill of [...persisted(), ...recentBills().map(billFromRow), ...fixtures]) {
      if (seen.has(bill.key)) continue;
      seen.add(bill.key);
      const payment = settled[bill.key];
      merged.push(
        payment
          ? { ...bill, status: "Paid", paymentRef: payment.entryNo }
          : bill,
      );
    }
    return merged;
  };

  const open = () => rows().filter((bill) => bill.status !== "Paid");
  const bucket = (name: BillView["bucket"]) =>
    open().filter((bill) => bill.bucket === name).reduce((sum, bill) => sum + bill.amount, 0);
  const total = () => open().reduce((sum, bill) => sum + bill.amount, 0);

  const selectedBills = () => open().filter((bill) => selected()[bill.key]);
  const runTotal = () => selectedBills().reduce((sum, bill) => sum + bill.amount, 0);

  const openRun = () => {
    const map: Record<string, boolean> = {};
    for (const bill of open()) map[bill.key] = true;
    selected.set(map);
    notice.set("");
    runOpen.set(true);
  };

  const toggle = (key: string) =>
    selected.update((map) => ({ ...map, [key]: !map[key] }));

  const pay = () => {
    const bill = paying();
    if (!bill) return;
    const entryNo = nextJournalNo();
    const amountCents = Math.round(bill.amount * 100);
    recordBillPayment(bill.invoice, bill.vendor, amountCents, entryNo);
    persisted.update((list) =>
      list.map((row) =>
        row.key === bill.key ? { ...row, status: "Paid", paymentRef: entryNo } : row,
      ),
    );
    paying.set(null);
    void payVendorBill({
      billId: bill.id ?? undefined,
      billNo: bill.invoice,
      entryNo,
    }).catch((error) => {
      console.log("vendor payment not written to sqlite: " + (error?.message ?? error));
    });
  };

  const approveRun = () => {
    const bills = selectedBills();
    if (bills.length === 0) return;
    const paidAt = new Date().toISOString();
    const requests = bills.map((bill) => ({
      billId: bill.id ?? undefined,
      billNo: bill.invoice,
      entryNo: nextJournalNo(),
    }));
    const totalCents = bills.reduce(
      (sum, bill) => sum + Math.round(bill.amount * 100),
      0,
    );
    bills.forEach((bill, index) => {
      recordBillPayment(
        bill.invoice,
        bill.vendor,
        Math.round(bill.amount * 100),
        requests[index].entryNo,
      );
    });
    persisted.update((list) =>
      list.map((row) => {
        const index = bills.findIndex((bill) => bill.key === row.key);
        return index >= 0
          ? { ...row, status: "Paid", paymentRef: requests[index].entryNo }
          : row;
      }),
    );
    approval.set(false);
    runOpen.set(false);
    notice.set(
      "Pay run posted · " +
        bills.length +
        (bills.length === 1 ? " bill" : " bills") +
        " · " +
        money(totalCents / 100),
    );
    void payVendorBills({ bills: requests, paidAt }).catch((error) => {
      console.log("pay run not written to sqlite: " + (error?.message ?? error));
    });
  };

  return (
    <Screen
      scroll={false}
      title="Vendor payables"
      subtitle="What the café owes, by age and due date"
      actions={
        <>
          <Button label="Payment schedule" icon="event" />
          <Button label="Start pay run" icon="payments" variant="primary" onPress={openRun} />
        </>
      }
    >
      <View class="flex-row gap-3">
        <StatTile
          label="Total payable"
          value={money(total())}
          hint={open().length + (open().length === 1 ? " open bill" : " open bills")}
          icon="request_quote"
        />
        <StatTile label="Current" value={money(bucket("Current"))} hint="due in 7+ days" icon="check_circle" tone="success" />
        <StatTile label="1–30 days" value={money(bucket("1–30 days"))} hint="past due" icon="schedule" tone="warn" />
        <StatTile label="31–60 days" value={money(bucket("31–60 days"))} hint="aged" icon="warning" tone="info" />
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
              <HeadCell label="Vendor" flex={1.8} />
              <HeadCell label="Invoice" flex={1.3} />
              <HeadCell label="Due" flex={0.9} />
              <HeadCell label="Ageing" flex={1.1} />
              <HeadCell label="Amount" flex={1} align="right" />
              <HeadCell label="Status" flex={1} />
              <HeadCell label="" w={70} />
            </Head>
            <Each of={rows()}>
              {(bill) => (
                <Row>
                  <Cell flex={1.8}>
                    <Text class="font-label text-label-md text-on-surface truncate">{bill().vendor}</Text>
                  </Cell>
                  <TextCell text={bill().invoice} flex={1.3} mono muted />
                  <TextCell text={bill().due} flex={0.9} muted />
                  <Cell flex={1.1}>
                    <Text class="font-body text-body-md text-on-surface-variant">{bill().bucket}</Text>
                  </Cell>
                  <TextCell text={money(bill().amount)} flex={1} align="right" strong />
                  <Cell flex={1}>
                    <StatusPill
                      label={bill().status}
                      tone={
                        bill().status === "Paid"
                          ? "success"
                          : bill().status === "Overdue"
                            ? "error"
                            : bill().status === "Due"
                              ? "warn"
                              : "neutral"
                      }
                    />
                  </Cell>
                  <Cell w={70} align="right">
                    <If
                      when={bill().status !== "Paid"}
                      else={
                        <Text class="font-body text-body-sm tabular-nums text-secondary">
                          {bill().paymentRef ?? "Paid"}
                        </Text>
                      }
                    >
                      <Button
                        label="Pay"
                        size="sm"
                        variant="soft"
                        a11yLabel={"Pay " + bill().invoice}
                        onPress={() => paying.set(bill())}
                      />
                    </If>
                  </Cell>
                </Row>
              )}
            </Each>
          </Scroll>
        </TableWrap>

        <View class="gap-3" style={{ width: 330 }}>
          <View class="gap-2.5 rounded-md border border-outline-variant bg-surface-container-lowest p-4">
            <CardHeader title="Ageing profile" hint="Share of total" />
            <View class="gap-1">
              <View class="flex-row items-center justify-between">
                <Text class="font-body text-body-sm text-on-surface">Current</Text>
                <Text class="font-label text-label-sm tabular-nums text-outline">{money(bucket("Current"))}</Text>
              </View>
              <ProgressBar value={bucket("Current") / Math.max(1, total())} color="#3F5E27" height={6} />
            </View>
            <View class="gap-1">
              <View class="flex-row items-center justify-between">
                <Text class="font-body text-body-sm text-on-surface">1–30 days</Text>
                <Text class="font-label text-label-sm tabular-nums text-outline">{money(bucket("1–30 days"))}</Text>
              </View>
              <ProgressBar value={bucket("1–30 days") / Math.max(1, total())} color="#B44326" height={6} />
            </View>
            <View class="gap-1">
              <View class="flex-row items-center justify-between">
                <Text class="font-body text-body-sm text-on-surface">31–60 days</Text>
                <Text class="font-label text-label-sm tabular-nums text-outline">{money(bucket("31–60 days"))}</Text>
              </View>
              <ProgressBar value={bucket("31–60 days") / Math.max(1, total())} color="#BA1A1A" height={6} />
            </View>
          </View>

          <View class="gap-2 rounded-md border border-amber/20 bg-amber-container p-4">
            <View class="flex-row items-center gap-2">
              <Icon name="schedule" size={18} color="#7E5700" />
              <Text class="font-title text-title-md text-on-amber-container">One bill is overdue</Text>
            </View>
            <Text class="font-body text-body-sm text-on-amber-container">
              Bar Essentials INV-22871 was due on 20 November. Paying late risks a
              hold on the next syrup delivery.
            </Text>
            <Button label="Schedule payment" size="sm" variant="danger" />
          </View>

          <View class="flex-1 gap-2 rounded-md border border-outline-variant bg-surface-container-low p-4">
            <CardHeader title="Next pay run" hint="Thursday · 10:00 AM" />
            <InfoRow label="Bills included" value={String(open().length)} />
            <InfoRow label="Total" value={money(total())} />
            <InfoRow label="From" value="Meezan current" />
            <Button label="Preview pay run" size="sm" variant="ghost" iconRight="arrow_forward" onPress={openRun} />
          </View>
        </View>
      </View>

      <If when={runOpen()}>
        <Drawer
          title="Pay run"
          subtitle="Choose the bills to settle in this run"
          width={540}
          onClose={() => runOpen.set(false)}
        >
          <View class="flex-1 min-h-0">
            <Scroll class="flex-1">
              <Each of={open()}>
                {(bill) => (
                  <View
                    role="button"
                    accessibilityLabel={"Toggle " + bill().invoice}
                    onPress={() => toggle(bill().key)}
                    class="flex-row items-center gap-3 border-b border-outline-variant/60 px-4 py-3 hover:bg-surface-container-low"
                  >
                    <View
                      class={
                        "h-5 w-5 items-center justify-center rounded-sm border " +
                        (selected()[bill().key]
                          ? "border-primary bg-primary"
                          : "border-outline-variant bg-surface-container-lowest")
                      }
                    >
                      <If when={selected()[bill().key]}>
                        <Icon name="check" size={13} color="#FFFFFF" />
                      </If>
                    </View>
                    <View class="flex-1 gap-0 min-w-0">
                      <Text class="font-label text-label-md text-on-surface truncate">{bill().vendor}</Text>
                      <Text class="font-body text-body-sm text-outline truncate">
                        {bill().invoice} · due {bill().due}
                      </Text>
                    </View>
                    <Text class="font-label text-label-lg tabular-nums text-on-surface">
                      {money(bill().amount)}
                    </Text>
                  </View>
                )}
              </Each>
              <If when={open().length === 0}>
                <Text class="p-4 font-body text-body-sm text-outline">No open bills to pay.</Text>
              </If>
            </Scroll>

            <View class="gap-3 border-t border-outline-variant p-4">
              <View class="flex-row items-center justify-between">
                <Text class="font-body text-body-md text-on-surface">
                  {selectedBills().length + " selected"}
                </Text>
                <Text class="font-label text-label-lg tabular-nums text-on-surface">
                  {money(runTotal())}
                </Text>
              </View>
              <View class="flex-row gap-2">
                <Button label="Cancel" grow onPress={() => runOpen.set(false)} />
                <Button
                  label="Post pay run"
                  a11yLabel="Post pay run"
                  icon="payments"
                  variant="primary"
                  grow
                  disabled={selectedBills().length === 0}
                  onPress={() => approval.set(true)}
                />
              </View>
              <Text class="font-body text-body-sm text-outline">
                A manager approves the run; each bill posts its own AP → bank entry.
              </Text>
            </View>
          </View>
        </Drawer>
      </If>

      <If when={approval()}>
        {() => (
          <ApprovalModal
            title="Approve pay run"
            detail={
              money(runTotal()) +
              " from Meezan current · " +
              selectedBills().length +
              (selectedBills().length === 1 ? " bill" : " bills")
            }
            onClose={() => approval.set(false)}
            onApprove={approveRun}
          />
        )}
      </If>

      <If when={paying()}>
        {() => {
          const bill = paying();
          if (!bill) return null;
          return (
            <ApprovalModal
              title="Approve supplier payment"
              detail={money(bill.amount) + " to " + bill.vendor + " · " + bill.invoice}
              onClose={() => paying.set(null)}
              onApprove={pay}
            />
          );
        }}
      </If>
    </Screen>
  );
}
