import { Scroll, signal, Text, View } from "nsh";
import { Icon } from "../../ui/Icon";
import { Button } from "../../ui/Button";
import { Toggle } from "../../ui/Avatar";
import { Field, TextBox } from "../../ui/Field";
import { ReceiptModal } from "./Receipt";
import { lastInvoice, navigate, recentSales } from "../../store";
import { money } from "../../format";
import { sales } from "../../data/mock";

const invoice = () => lastInvoice();

/** The paper itself — a fixed A4 portrait sheet. */
function InvoiceSheet() {
  return (
    <View
      class="gap-5 rounded-sm border border-outline-variant bg-surface-bright p-8"
      style={{ width: 640 }}
    >
      <View class="flex-row items-start justify-between gap-4">
        <View class="flex-row items-center gap-2.5">
          <View class="h-10 w-10 items-center justify-center rounded-sm bg-primary-container">
            <Text class="font-headline text-title-lg text-on-primary">K</Text>
          </View>
          <View class="gap-0">
            <Text class="font-headline text-title-lg text-on-surface">Kova</Text>
            <Text class="font-body text-body-sm text-outline">
              Gulberg Café · Lahore
            </Text>
          </View>
        </View>
        <View class="items-end gap-0.5">
          <Text class="font-label text-label-sm uppercase tracking-label text-outline">
            Tax invoice
          </Text>
          <Text class="font-title text-title-lg tabular-nums text-on-surface">
            {invoice().number}
          </Text>
          <Text class="font-body text-body-sm text-outline">
            {invoice().issued}
          </Text>
        </View>
      </View>

      <View class="h-px bg-outline-variant" />

      <View class="flex-row justify-between gap-4">
        <View class="gap-1">
          <Text class="font-label text-label-sm uppercase tracking-label text-outline">
            Billed to
          </Text>
          <Text class="font-title text-title-md text-on-surface">
            {invoice().customer}
          </Text>
          <If when={invoice().customerNtn !== ""}>
            <Text class="font-body text-body-sm text-on-surface-variant tabular-nums">
              {invoice().customerNtn}
            </Text>
          </If>
        </View>
        <View class="gap-1 items-end">
          <Text class="font-label text-label-sm uppercase tracking-label text-outline">
            Served by
          </Text>
          <Text class="font-title text-title-md text-on-surface">
            {invoice().cashier}
          </Text>
          <Text class="font-body text-body-sm text-on-surface-variant tabular-nums">
            {invoice().channel} · {invoice().table}
          </Text>
          <Text class="font-body text-body-sm text-on-surface-variant">
            {invoice().method}
          </Text>
        </View>
      </View>

      <View class="rounded overflow-hidden border border-outline-variant">
        <View class="flex-row gap-3 bg-surface-container px-3 py-2">
          <Text class="flex-1 font-label text-label-sm uppercase tracking-label text-outline">
            Description
          </Text>
          <Text class="w-10 text-right font-label text-label-sm uppercase tracking-label text-outline">
            Qty
          </Text>
          <Text class="w-16 text-right font-label text-label-sm uppercase tracking-label text-outline">
            Rate
          </Text>
          <Text class="w-20 text-right font-label text-label-sm uppercase tracking-label text-outline">
            Amount
          </Text>
        </View>
        <Each of={invoice().lines}>
          {(line) => (
            <View class="flex-row items-center gap-3 border-t border-outline-variant/60 px-3 py-2.5">
              <View class="flex-1 gap-0.5">
                <Text class="font-body text-body-md text-on-surface">
                  {line().name}
                </Text>
                <If when={line().note !== ""}>
                  <Text class="font-body text-body-sm text-outline">
                    {line().note}
                  </Text>
                </If>
              </View>
              <Text class="w-10 text-right font-body text-body-md tabular-nums text-on-surface-variant">
                {line().qty}
              </Text>
              <Text class="w-16 text-right font-body text-body-md tabular-nums text-on-surface-variant">
                {money(line().price)}
              </Text>
              <Text class="w-20 text-right font-body text-body-md tabular-nums text-on-surface">
                {money(line().price * line().qty)}
              </Text>
            </View>
          )}
        </Each>
      </View>

      <View class="flex-row justify-between gap-6">
        <View class="flex-1 gap-1">
          <Text class="font-label text-label-sm uppercase tracking-label text-outline">
            Payment
          </Text>
          <Text class="font-body text-body-sm text-on-surface-variant">
            {invoice().method === "Cash"
              ? "Cash received " +
                money(invoice().tendered) +
                " · change " +
                money(invoice().change)
              : invoice().method === "Credit"
                ? "On account · net 15 days"
                : invoice().method + " · paid in full"}
          </Text>
          <Text class="font-body text-body-sm text-outline">
            Thank you — loyalty points post within the hour.
          </Text>
        </View>

        <View class="gap-1" style={{ width: 220 }}>
          <View class="flex-row justify-between">
            <Text class="font-body text-body-md text-on-surface-variant">
              Subtotal
            </Text>
            <Text class="font-body text-body-md tabular-nums text-on-surface">
              {money(invoice().subtotal)}
            </Text>
          </View>
          <If when={invoice().discount > 0}>
            <View class="flex-row justify-between">
              <Text class="font-body text-body-md text-secondary">Discount</Text>
              <Text class="font-body text-body-md tabular-nums text-secondary">
                −{money(invoice().discount)}
              </Text>
            </View>
          </If>
          <View class="flex-row justify-between">
            <Text class="font-body text-body-md text-on-surface-variant">
              GST (8%)
            </Text>
            <Text class="font-body text-body-md tabular-nums text-on-surface">
              {money(invoice().tax)}
            </Text>
          </View>
          <If when={invoice().tip > 0}>
            <View class="flex-row justify-between">
              <Text class="font-body text-body-md text-on-surface-variant">Tip</Text>
              <Text class="font-body text-body-md tabular-nums text-on-surface">
                {money(invoice().tip)}
              </Text>
            </View>
          </If>
          <View class="flex-row items-baseline justify-between border-t border-outline-variant pt-2">
            <Text class="font-title text-title-md text-on-surface">Total</Text>
            <Text class="font-title text-headline-md tabular-nums text-on-surface">
              {money(invoice().total)}
            </Text>
          </View>
        </View>
      </View>

      <View class="h-px bg-outline-variant" />

      <View class="flex-row items-end justify-between gap-4">
        <View class="gap-0.5">
          <Text class="font-body text-body-sm text-outline">
            Kova ERP · NTN 7712345-6 · invoices@kova.pk
          </Text>
          <Text class="font-body text-body-sm text-outline tabular-nums">
            {invoice().number} · page 1 of 1
          </Text>
        </View>
        <View class="items-center gap-1">
          <View class="h-8 w-32 border-b border-outline" />
          <Text class="font-body text-body-sm text-outline">
            Authorised signature
          </Text>
        </View>
      </View>
    </View>
  );
}

export function InvoiceScreen() {
  const paper = signal("A4 Portrait (210 x 297 mm)");
  const billTo = signal("Nadia Tariq — Crescent Tech");
  const taxId = signal("NTN-4829104-2");
  const gstBreakdown = signal(true);
  const signature = signal(true);
  const receiptOpen = signal(false);

  return (
    <View class="flex-1 flex-col gap-5 p-6 min-h-0" style={{ position: "relative" }}>
      <View class="flex-row items-center justify-between gap-3">
        <View class="gap-0.5">
          <Text class="font-headline text-headline-lg text-on-surface">
            Sale invoice (A4)
          </Text>
          <Text class="font-body text-body-sm text-outline tabular-nums">
            {lastInvoice().number} · A4 paper voucher (210 × 297 mm) · Gulberg Café
          </Text>
        </View>
        <View class="flex-row items-center gap-2">
          <Button label="Back to sales" onPress={() => navigate("sales")} />
          <Button
            label="Receipt"
            icon="receipt_long"
            onPress={() => receiptOpen.set(true)}
          />
          <Button
            label="Print A4 invoice"
            icon="print"
            variant="primary"
            onPress={() => {}}
          />
        </View>
      </View>

      <View class="flex-1 flex-row gap-4 min-h-0">
        {/* Voucher settings */}
        <View class="gap-4" style={{ width: 304 }}>
          <View class="gap-3 rounded-md border border-outline-variant bg-surface-container-lowest p-4">
            <Text class="border-b border-outline-variant pb-2 font-headline text-title-md text-on-surface">
              Paper & customer
            </Text>

            <Field label="Voucher paper size">
              <View class="flex-row items-center justify-between rounded border border-outline-variant bg-surface px-3 py-2">
                <Text class="font-body text-body-md text-on-surface">
                  {paper()}
                </Text>
                <Icon name="expand_more" size={18} color="#6B5752" />
              </View>
            </Field>
            <Field label="Customer / Bill To">
              <TextBox value={billTo()} onChange={(value) => billTo.set(value)} />
            </Field>
            <Field label="Customer NTN / Tax ID">
              <TextBox value={taxId()} onChange={(value) => taxId.set(value)} />
            </Field>

            <View class="flex-row items-center justify-between gap-2 pt-1">
              <Text class="flex-1 font-body text-body-sm text-on-surface">
                Show GST (8%) breakdown
              </Text>
              <Toggle
                checked={gstBreakdown()}
                onChange={(value) => gstBreakdown.set(value)}
                label="Show GST breakdown"
              />
            </View>
            <View class="flex-row items-center justify-between gap-2">
              <Text class="flex-1 font-body text-body-sm text-on-surface">
                Include branch signature & stamp
              </Text>
              <Toggle
                checked={signature()}
                onChange={(value) => signature.set(value)}
                label="Include signature"
              />
            </View>
          </View>

          <View class="flex-1 gap-2 rounded-md border border-outline-variant bg-surface-container-lowest p-4">
            <View class="flex-row items-center justify-between">
              <Text class="font-label text-label-md text-on-surface">
                Recent A4 invoices
              </Text>
              <Text class="font-body text-body-sm text-outline tabular-nums">
                {sales.length} this week
              </Text>
            </View>
            <Each of={sales.slice(0, 4)}>
              {(sale) => (
                <View class="flex-row items-center justify-between gap-2 border-t border-outline-variant/60 py-2">
                  <View class="gap-0">
                    <Text class="font-label text-label-md tabular-nums text-on-surface">
                      {sale().invoice}
                    </Text>
                    <Text class="font-body text-body-sm text-outline">
                      {sale().customer} · {sale().time}
                    </Text>
                  </View>
                  <Text class="font-label text-label-md tabular-nums text-on-surface">
                    {money(sale().total)}
                  </Text>
                </View>
              )}
            </Each>
            <If when={recentSales().length > 0}>
              <Text class="font-body text-body-sm text-secondary">
                {recentSales().length} new invoice
                {recentSales().length === 1 ? "" : "s"} this session
              </Text>
            </If>
          </View>
        </View>

        {/* Paper preview */}
        <Scroll class="flex-1" contentClass="items-center pt-1 pb-4">
          <InvoiceSheet />
        </Scroll>
      </View>

      <If when={receiptOpen()}>
        <ReceiptModal onClose={() => receiptOpen.set(false)} />
      </If>
    </View>
  );
}
