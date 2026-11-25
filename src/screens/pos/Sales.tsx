import { computed, Scroll, signal, Text, View } from "nsh";
import { Icon } from "../../ui/Icon";
import { Button } from "../../ui/Button";
import { Chip, StatusPill, type Tone } from "../../ui/Badge";
import { StatTile } from "../../ui/Card";
import { TableWrap, Head, HeadCell, Row, Cell, TextCell } from "../../ui/Table";
import { Drawer } from "../../ui/Drawer";
import { ApprovalModal } from "../../ui/ApprovalModal";
import { Field, TextBox } from "../../ui/Field";
import {
  markSaleStatus,
  navigate,
  recentSales,
  saleStatusOverride,
  searchQuery,
} from "../../store";
import { invoiceLines, refundInvoice, voidInvoice } from "../../db/repo";
import { syncState } from "../../sync/state";
import { sales, type SaleRecord } from "../../data/mock";
import { money, count } from "../../format";

const tabs = ["All", "Paid", "Refunded", "Void"] as const;

const statusTone: Record<SaleRecord["status"], Tone> = {
  Paid: "success",
  Refunded: "warn",
  Void: "error",
};

const reasons = ["Wrong order", "Customer changed mind", "Quality issue", "Duplicate"];

interface StoredLine {
  description: string;
  qty: number;
  unit_price_cents: number;
  amount_cents: number;
}

export function SalesScreen() {
  const tab = signal<(typeof tabs)[number]>("All");
  const selected = signal<SaleRecord | null>(null);
  const lines = signal<StoredLine[]>([]);
  const mode = signal<"detail" | "refund">("detail");
  const amount = signal("");
  const method = signal("Cash");
  const reason = signal(reasons[0]);
  const note = signal("");
  const done = signal("");
  const busy = signal(false);
  const approval = signal<"refund" | "void" | null>(null);

  const statusOf = (sale: SaleRecord): SaleRecord["status"] =>
    saleStatusOverride()[sale.invoice] ?? sale.status;

  const rows = computed(() => {
    const query = searchQuery().trim().toLowerCase();
    const all = [...recentSales(), ...sales].map((sale) => ({
      ...sale,
      status: statusOf(sale),
    }));
    return all.filter((sale) => {
      const inTab = tab() === "All" || sale.status === tab();
      const inQuery =
        query === "" ||
        sale.invoice.toLowerCase().includes(query) ||
        sale.customer.toLowerCase().includes(query) ||
        sale.cashier.toLowerCase().includes(query);
      return inTab && inQuery;
    });
  });

  const totals = computed(() => {
    const list = rows();
    const gross = list.reduce((sum, sale) => sum + sale.total, 0);
    const refunds = list
      .filter((sale) => sale.status !== "Paid")
      .reduce((sum, sale) => sum + sale.total, 0);
    return { gross, refunds, net: gross - refunds };
  });

  const open = (sale: SaleRecord) => {
    selected.set(sale);
    lines.set([]);
    mode.set("detail");
    done.set("");
    note.set("");
    if (recentSales().some((row) => row.invoice === sale.invoice)) {
      void invoiceLines(sale.invoice)
        .then((stored) => {
          if (selected()?.invoice === sale.invoice) lines.set(stored);
        })
        .catch(() => undefined);
    }
  };

  const close = () => {
    selected.set(null);
    mode.set("detail");
    done.set("");
  };

  const startRefund = () => {
    const sale = selected();
    if (!sale) return;
    amount.set(sale.total.toFixed(2));
    method.set(sale.method === "Card" ? "Card" : "Cash");
    reason.set(reasons[0]);
    note.set("");
    mode.set("refund");
  };

  const confirmRefund = async () => {
    const sale = selected();
    if (!sale || busy()) return;
    const value = Math.round((Number(amount()) || 0) * 100) / 100;
    if (value <= 0) return;
    busy.set(true);
    try {
      const result = syncState().dbReady
        ? await refundInvoice({
            invoiceNo: sale.invoice,
            amountCents: Math.round(value * 100),
            method: method(),
            reason: reason() + (note().trim() ? " · " + note().trim() : ""),
          })
        : { ok: false, full: value >= sale.total };
      if (result.full) markSaleStatus(sale.invoice, "Refunded");
      done.set(
        (result.full ? "Refunded " : "Partial refund of ") +
          money(value) +
          " recorded" +
          (result.ok ? "." : " locally (demo invoice)."),
      );
      selected.set({ ...sale, status: result.full ? "Refunded" : sale.status });
      mode.set("detail");
    } catch (error) {
      done.set("Refund failed: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      busy.set(false);
    }
  };

  const confirmVoid = async () => {
    const sale = selected();
    if (!sale) return;
    try {
      const ok = syncState().dbReady ? await voidInvoice(sale.invoice) : false;
      markSaleStatus(sale.invoice, "Void");
      selected.set({ ...sale, status: "Void" });
      done.set("Invoice voided" + (ok ? "." : " locally (demo invoice)."));
    } catch (error) {
      done.set("Void failed: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  return (
    <View class="flex-1 flex-col gap-4 p-6 min-h-0" style={{ position: "relative" }}>
      <View class="flex-row items-center justify-between gap-3">
        <View class="gap-0.5">
          <Text class="font-headline text-headline-lg text-on-surface">Sales</Text>
          <Text class="font-body text-body-sm text-outline">
            Every invoice for this terminal · {rows().length} rows · newest first
          </Text>
        </View>
        <View class="flex-row items-center gap-2">
          <Button label="Export CSV" icon="download" />
          <Button label="New invoice" icon="note_add" onPress={() => navigate("new-sale")} />
          <Button label="Open A4 invoice" icon="print" variant="primary" onPress={() => navigate("invoice")} />
        </View>
      </View>

      <View class="flex-row gap-3">
        <StatTile label="Gross taken" value={money(totals().gross)} delta="+18.2%" positive hint="vs yesterday" icon="payments" />
        <StatTile label="Refunds" value={money(totals().refunds)} delta="−0.6%" positive hint="2 of 186" icon="undo" tone="warn" />
        <StatTile label="Net sales" value={money(totals().net)} delta="+17.4%" positive hint="after refunds" icon="account_balance_wallet" tone="success" />
        <StatTile label="Invoices" value={count(rows().length)} hint="this session + history" icon="description" tone="info" />
      </View>

      <View class="flex-row items-center gap-2">
        <Each of={tabs}>
          {(name) => (
            <Chip label={name()} selected={tab() === name()} onPress={() => tab.set(name())} />
          )}
        </Each>
        <View class="flex-1" />
        <View class="flex-row items-center gap-1.5 rounded border border-outline-variant bg-surface-container-lowest px-2.5 py-1.5">
          <Icon name="filter_list" size={16} color="#6B5752" />
          <Text class="font-label text-label-sm text-on-surface-variant">This terminal</Text>
        </View>
        <View class="flex-row items-center gap-1.5 rounded border border-outline-variant bg-surface-container-lowest px-2.5 py-1.5">
          <Icon name="person" size={16} color="#6B5752" />
          <Text class="font-label text-label-sm text-on-surface-variant">All cashiers</Text>
        </View>
      </View>

      <TableWrap class="flex-1 min-h-0">
        <Scroll class="flex-1">
          <Head>
            <HeadCell label="Invoice" flex={2.2} />
            <HeadCell label="When" flex={1.3} />
            <HeadCell label="Customer" flex={1.6} />
            <HeadCell label="Channel" flex={1.1} />
            <HeadCell label="Method" flex={1} />
            <HeadCell label="Items" w={56} align="right" />
            <HeadCell label="Total" flex={1} align="right" />
            <HeadCell label="Status" flex={1} />
          </Head>
          <Each of={rows()}>
            {(sale) => (
              <Row onPress={() => open(sale())}>
                <Cell flex={2.2}>
                  <Text class="font-label text-label-md tabular-nums text-on-surface truncate">
                    {sale().invoice}
                  </Text>
                </Cell>
                <Cell flex={1.3}>
                  <View class="gap-0">
                    <Text class="font-body text-body-md text-on-surface">{sale().date}</Text>
                    <Text class="font-body text-body-sm tabular-nums text-outline">{sale().time}</Text>
                  </View>
                </Cell>
                <Cell flex={1.6}>
                  <Text class="font-body text-body-md text-on-surface truncate">{sale().customer}</Text>
                </Cell>
                <Cell flex={1.1}>
                  <Text class="font-body text-body-md text-on-surface-variant">{sale().channel}</Text>
                </Cell>
                <Cell flex={1}>
                  <View class="flex-row items-center gap-1">
                    <Icon
                      name={sale().method === "Cash" ? "payments" : sale().method === "Card" ? "credit_card" : "account_balance_wallet"}
                      size={14}
                      color="#6B5752"
                    />
                    <Text class="font-body text-body-md text-on-surface-variant">{sale().method}</Text>
                  </View>
                </Cell>
                <TextCell text={String(sale().items)} w={56} align="right" muted />
                <TextCell text={money(sale().total)} flex={1} align="right" strong />
                <Cell flex={1}>
                  <StatusPill label={sale().status} tone={statusTone[sale().status]} />
                </Cell>
              </Row>
            )}
          </Each>
          <If when={rows().length === 0}>
            <View class="items-center justify-center gap-2 py-14">
              <Icon name="receipt_long" size={26} color="#6B5752" />
              <Text class="font-body text-body-md text-outline">No invoices match this filter.</Text>
            </View>
          </If>
        </Scroll>
      </TableWrap>

      <If when={selected()}>
        {() => {
          const sale = selected();
          if (!sale) return null;
          return (
            <Drawer
              onClose={close}
              title={sale.invoice}
              subtitle={sale.date + " · " + sale.time + " · " + sale.cashier}
            >
              <Scroll class="flex-1" contentClass="p-4 gap-4">
                <View class="flex-row items-center justify-between gap-2">
                  <StatusPill label={statusOf(sale)} tone={statusTone[statusOf(sale)]} />
                  <Text class="font-body text-body-sm text-outline">
                    {sale.channel} · {sale.method}
                  </Text>
                </View>

                <If when={done() !== ""}>
                  <View class="flex-row items-start gap-2 rounded border border-secondary/20 bg-secondary-container px-3 py-2">
                    <Icon name="check_circle" size={16} color="#3F5E27" />
                    <Text class="flex-1 font-body text-body-sm text-on-secondary-container">
                      {done()}
                    </Text>
                  </View>
                </If>

                <View class="gap-1 rounded-md border border-outline-variant bg-surface-container-low p-3">
                  <View class="flex-row items-center justify-between">
                    <Text class="font-body text-body-sm text-on-surface-variant">Customer</Text>
                    <Text class="font-label text-label-md text-on-surface">{sale.customer}</Text>
                  </View>
                  <View class="flex-row items-center justify-between">
                    <Text class="font-body text-body-sm text-on-surface-variant">Items</Text>
                    <Text class="font-label text-label-md tabular-nums text-on-surface">{sale.items}</Text>
                  </View>
                  <View class="flex-row items-center justify-between border-t border-outline-variant pt-1.5">
                    <Text class="font-body text-body-sm text-on-surface-variant">Subtotal</Text>
                    <Text class="font-label text-label-md tabular-nums text-on-surface">{money(sale.subtotal)}</Text>
                  </View>
                  <View class="flex-row items-center justify-between">
                    <Text class="font-body text-body-sm text-on-surface-variant">GST (8%)</Text>
                    <Text class="font-label text-label-md tabular-nums text-on-surface">{money(sale.tax)}</Text>
                  </View>
                  <View class="flex-row items-baseline justify-between border-t border-outline-variant pt-2">
                    <Text class="font-title text-title-md text-on-surface">Total</Text>
                    <Text class="font-title text-title-lg tabular-nums text-on-surface">{money(sale.total)}</Text>
                  </View>
                </View>

                <View class="gap-2">
                  <Text class="font-label text-label-sm uppercase tracking-label text-outline">
                    Items
                  </Text>
                  <If
                    when={lines().length > 0}
                    else={
                      <Text class="font-body text-body-sm text-outline">
                        Line detail is in the A4 voucher for this demo invoice.
                      </Text>
                    }
                  >
                    <Each of={lines()}>
                      {(line) => (
                        <View class="flex-row items-center justify-between gap-2 border-t border-outline-variant/60 pt-2">
                          <View class="flex-1 gap-0 min-w-0">
                            <Text class="font-body text-body-md text-on-surface truncate">{line().description}</Text>
                            <Text class="font-body text-body-sm text-outline tabular-nums">
                              {line().qty} × {money(Number(line().unit_price_cents) / 100)}
                            </Text>
                          </View>
                          <Text class="font-label text-label-md tabular-nums text-on-surface">
                            {money(Number(line().amount_cents) / 100)}
                          </Text>
                        </View>
                      )}
                    </Each>
                  </If>
                </View>

                <If when={mode() === "refund"}>
                  <View class="gap-3 rounded-md border border-primary-container bg-surface-variant p-3">
                    <View class="flex-row items-center justify-between">
                      <Text class="font-title text-title-md text-on-surface">Refund</Text>
                      <View
                        role="button"
                        accessibilityLabel="Cancel refund"
                        onPress={() => mode.set("detail")}
                        class="h-7 w-7 items-center justify-center rounded-sm border border-outline-variant"
                      >
                        <Icon name="close" size={14} />
                      </View>
                    </View>

                    <Field label="Amount" hint={"Up to " + money(sale.total)}>
                      <TextBox value={amount()} onChange={(value) => amount.set(value)} />
                    </Field>

                    <View class="gap-1.5">
                      <Text class="font-label text-label-md text-on-surface-variant">Method</Text>
                      <View class="flex-row gap-1">
                        <Each of={["Cash", "Card"]}>
                          {(option) => (
                            <View
                              role="button"
                              onPress={() => method.set(option())}
                              class={
                                "flex-1 items-center rounded-sm border py-1.5 " +
                                (method() === option()
                                  ? "border-primary-container bg-surface-container-lowest"
                                  : "border-outline-variant bg-surface-container-low")
                              }
                            >
                              <Text class="font-label text-label-md text-on-surface">{option()}</Text>
                            </View>
                          )}
                        </Each>
                      </View>
                    </View>

                    <View class="gap-1.5">
                      <Text class="font-label text-label-md text-on-surface-variant">Reason</Text>
                      <View class="flex-row flex-wrap gap-1">
                        <Each of={reasons}>
                          {(option) => (
                            <View
                              role="button"
                              onPress={() => reason.set(option())}
                              class={
                                "rounded-full border px-2.5 py-1 " +
                                (reason() === option()
                                  ? "border-primary-container bg-surface-container-lowest"
                                  : "border-outline-variant bg-surface-container-low")
                              }
                            >
                              <Text class="font-label text-label-sm text-on-surface">{option()}</Text>
                            </View>
                          )}
                        </Each>
                      </View>
                    </View>

                    <Field label="Note" hint="Optional, kept on the refund record">
                      <TextBox value={note()} onChange={(value) => note.set(value)} />
                    </Field>

                    <Button
                      label={busy() ? "Posting…" : "Confirm refund · " + money(Number(amount()) || 0)}
                      variant="primary"
                      icon="undo"
                      disabled={busy() || (Number(amount()) || 0) <= 0}
                      onPress={confirmRefund}
                    />
                  </View>
                </If>
              </Scroll>

              <If when={mode() === "detail"}>
                <View class="gap-2 border-t border-outline-variant p-4">
                  <Button
                    label="Open A4 invoice"
                    icon="print"
                    onPress={() => {
                      close();
                      navigate("invoice");
                    }}
                  />
                  <View class="flex-row gap-2">
                    <Button
                      label="Refund"
                      icon="undo"
                      variant="soft"
                      grow
                      disabled={statusOf(sale) === "Refunded" || statusOf(sale) === "Void"}
                      onPress={() => approval.set("refund")}
                    />
                    <Button
                      label="Void invoice"
                      icon="block"
                      variant="danger"
                      grow
                      disabled={statusOf(sale) === "Void"}
                      onPress={() => approval.set("void")}
                    />
                  </View>
                </View>
              </If>
            </Drawer>
          );
        }}
      </If>

      <If when={approval()}>
        {() => {
          const sale = selected();
          const action = approval();
          if (!sale || !action) return null;
          return (
            <ApprovalModal
              title={action === "refund" ? "Approve refund" : "Approve void"}
              detail={
                action === "refund"
                  ? money(sale.total) + " refund for " + sale.invoice
                  : "Void " + sale.invoice + " · " + money(sale.total)
              }
              onClose={() => approval.set(null)}
              onApprove={() => {
                approval.set(null);
                if (action === "refund") startRefund();
                else void confirmVoid();
              }}
            />
          );
        }}
      </If>
    </View>
  );
}
