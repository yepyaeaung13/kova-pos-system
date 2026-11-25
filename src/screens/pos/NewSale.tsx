import { Scroll, signal, Text, View } from "nsh";
import { Icon } from "../../ui/Icon";
import { Button } from "../../ui/Button";
import { Field, TextBox } from "../../ui/Field";
import { Modal } from "../../ui/Modal";
import {
  cashier,
  catalog,
  hydrateSales,
  lastInvoice,
  navigate,
  stamp,
  type InvoiceSnapshot,
} from "../../store";
import { allocateInvoiceNo, writeInvoice } from "../../db/repo";
import type { Product } from "../../data/mock";
import { money } from "../../format";

interface DraftLine {
  key: string;
  productId: string;
  name: string;
  note: string;
  price: number;
  qty: number;
}

const termsOptions = ["Paid", "Net 7", "Net 15"];
const paperOptions = ["A4", "A5", "80mm"];

let draftSeq = 0;

export function NewSaleScreen() {
  const customer = signal("Zainab Studio (Catering)");
  const ntn = signal("NTN-1190421-8");
  const terms = signal("Paid");
  const paper = signal("A4");
  const note = signal("Catering drop-off at 4 PM — include serving boxes.");
  const addOpen = signal(false);
  const productQuery = signal("");
  const saving = signal(false);

  const lines = signal<DraftLine[]>([
    { key: "d1", productId: "p-01", name: "Café Latte (Regular)", note: "12 oz · Hot", price: 4.5, qty: 6 },
    { key: "d2", productId: "p-11", name: "Chicken Panini", note: "Grilled", price: 8.9, qty: 2 },
    { key: "d3", productId: "p-07", name: "Butter Croissant", note: "Bakery", price: 3.2, qty: 4 },
  ]);

  const sub = () =>
    Math.round(lines().reduce((sum, line) => sum + line.price * line.qty, 0) * 100) / 100;
  const gst = () => Math.round(sub() * 0.08 * 100) / 100;
  const grand = () => Math.round((sub() + gst()) * 100) / 100;

  const setQty = (key: string, qty: number) => {
    lines.update((list) =>
      qty <= 0
        ? list.filter((line) => line.key !== key)
        : list.map((line) => (line.key === key ? { ...line, qty } : line)),
    );
  };

  const addProduct = (product: Product) => {
    lines.update((list) => {
      const found = list.find((line) => line.productId === product.id);
      if (found) {
        return list.map((line) =>
          line.key === found.key ? { ...line, qty: line.qty + 1 } : line,
        );
      }
      draftSeq += 1;
      return [
        ...list,
        {
          key: "d" + draftSeq,
          productId: product.id,
          name: product.name,
          note: product.note,
          price: product.price,
          qty: 1,
        },
      ];
    });
    addOpen.set(false);
    productQuery.set("");
  };

  const save = () => {
    if (lines().length === 0 || saving()) return;
    saving.set(true);
    const paid = terms() === "Paid";
    const number = allocateInvoiceNo();
    const snapshot: InvoiceSnapshot = {
      number,
      issued: stamp(),
      cashier: cashier.name,
      customer: customer().trim() || "Walk-in",
      customerNtn: ntn().trim(),
      channel: "Takeaway",
      table: "Counter",
      method: paid ? "Card" : "Credit",
      lines: lines().map((line) => ({
        productId: line.productId,
        name: line.name,
        qty: line.qty,
        price: line.price,
        note: "",
      })),
      subtotal: sub(),
      discount: 0,
      tax: gst(),
      tip: 0,
      total: grand(),
      payments: [],
      tendered: paid ? grand() : 0,
      change: 0,
    };

    lastInvoice.set(snapshot);
    void writeInvoice({
      invoiceNo: number,
      customerName: snapshot.customer,
      customerNtn: snapshot.customerNtn,
      paperSize: paper(),
      terms: terms(),
      status: paid ? "Paid" : "Unpaid",
      lines: lines().map((line) => ({
        productId: line.productId,
        description: line.name,
        qty: line.qty,
        priceCents: Math.round(line.price * 100),
      })),
      subtotalCents: Math.round(sub() * 100),
      discountCents: 0,
      gstCents: Math.round(gst() * 100),
      totalCents: Math.round(grand() * 100),
      issuedAt: new Date().toISOString(),
    })
      .then(() => hydrateSales())
      .catch((error) => {
        console.log("invoice not written to sqlite: " + (error?.message ?? error));
      });

    navigate("invoice");
  };

  return (
    <View class="flex-1 flex-col gap-4 p-5 min-h-0" style={{ position: "relative" }}>
      <View class="flex-row items-center justify-between gap-3">
        <View class="flex-row items-center gap-3">
          <View
            role="button"
            accessibilityLabel="Back to sales"
            onPress={() => navigate("sales")}
            class="h-9 w-9 items-center justify-center rounded-sm border border-outline-variant bg-surface-container-lowest hover:bg-surface-container"
          >
            <Icon name="arrow_back" size={18} />
          </View>
          <View class="gap-0">
            <Text class="font-headline text-headline-lg text-on-surface">
              New sale invoice
            </Text>
            <Text class="font-body text-body-sm text-outline">
              Draft · {paper()} paper voucher · Gulberg Café
            </Text>
          </View>
        </View>
        <View class="flex-row items-center gap-2">
          <Button label="Cancel" onPress={() => navigate("sales")} />
          <Button
            label={saving() ? "Saving…" : "Save & print A4"}
            icon="print"
            variant="primary"
            disabled={saving() || lines().length === 0}
            onPress={save}
          />
        </View>
      </View>

      <View class="flex-1 flex-row gap-4 min-h-0">
        <View class="flex-1 flex-col gap-4 min-h-0" style={{ flex: 8 }}>
          <Scroll class="flex-1" contentClass="gap-4">
            <View class="gap-3 rounded-md border border-outline-variant bg-surface-container-lowest p-4">
              <Text class="border-b border-outline-variant pb-2 font-headline text-title-md text-on-surface">
                Customer & voucher details
              </Text>

              <View class="flex-row gap-3">
                <View class="flex-1">
                  <Field label="Customer / Bill To">
                    <TextBox value={customer()} onChange={(value) => customer.set(value)} />
                  </Field>
                </View>
                <View style={{ width: 220 }}>
                  <Field label="NTN / Tax ID">
                    <TextBox value={ntn()} onChange={(value) => ntn.set(value)} />
                  </Field>
                </View>
              </View>

              <View class="flex-row gap-3">
                <View class="flex-1">
                  <Field label="Invoice date">
                    <View class="rounded border border-outline-variant bg-surface-container-low px-3 py-2.5">
                      <Text class="font-body text-body-md tabular-nums text-on-surface">
                        {stamp().split(" · ")[0]}
                      </Text>
                    </View>
                  </Field>
                </View>
                <View class="flex-1">
                  <Field label="Payment terms">
                    <View class="flex-row gap-1">
                      <Each of={termsOptions}>
                        {(option) => (
                          <View
                            role="button"
                            onPress={() => terms.set(option())}
                            class={
                              "flex-1 items-center justify-center rounded-sm border py-2 " +
                              (terms() === option()
                                ? "border-primary-container bg-surface-variant"
                                : "border-outline-variant bg-surface-container-lowest")
                            }
                          >
                            <Text class="font-label text-label-md text-on-surface">
                              {option()}
                            </Text>
                          </View>
                        )}
                      </Each>
                    </View>
                  </Field>
                </View>
                <View style={{ width: 220 }}>
                  <Field label="Paper size">
                    <View class="flex-row gap-1">
                      <Each of={paperOptions}>
                        {(option) => (
                          <View
                            role="button"
                            onPress={() => paper.set(option())}
                            class={
                              "flex-1 items-center justify-center rounded-sm border py-2 " +
                              (paper() === option()
                                ? "border-primary-container bg-surface-variant"
                                : "border-outline-variant bg-surface-container-lowest")
                            }
                          >
                            <Text class="font-label text-label-md text-on-surface">
                              {option()}
                            </Text>
                          </View>
                        )}
                      </Each>
                    </View>
                  </Field>
                </View>
              </View>
            </View>

            <View class="overflow-hidden rounded-md border border-outline-variant bg-surface-container-lowest">
              <View class="flex-row items-center justify-between border-b border-outline-variant px-4 py-3">
                <Text class="font-headline text-title-md text-on-surface">
                  Sale items ({lines().length})
                </Text>
                <Button
                  label="Add item"
                  size="sm"
                  variant="ghost"
                  icon="add"
                  onPress={() => addOpen.set(true)}
                />
              </View>

              <View class="flex-row items-center gap-3 border-b border-outline-variant bg-surface-container-low px-4 py-2">
                <Text class="flex-1 font-label text-label-sm uppercase tracking-label text-outline">
                  Product
                </Text>
                <Text class="w-24 text-center font-label text-label-sm uppercase tracking-label text-outline">
                  Qty
                </Text>
                <Text class="w-20 text-right font-label text-label-sm uppercase tracking-label text-outline">
                  Unit price
                </Text>
                <Text class="w-24 text-right font-label text-label-sm uppercase tracking-label text-outline">
                  Amount
                </Text>
                <View class="w-6" />
              </View>

              <Each of={lines()}>
                {(line) => (
                  <View class="flex-row items-center gap-3 border-b border-outline-variant/60 px-4 py-2.5">
                    <View class="flex-1 gap-0 min-w-0">
                      <Text class="font-title text-title-md text-on-surface truncate">
                        {line().name}
                      </Text>
                      <Text class="font-body text-body-sm text-outline truncate">
                        {line().note}
                      </Text>
                    </View>
                    <View class="w-24 flex-row items-center justify-center gap-1 rounded-sm border border-outline-variant bg-surface-container-low px-1">
                      <View
                        role="button"
                        accessibilityLabel={"Decrease " + line().name}
                        onPress={() => setQty(line().key, line().qty - 1)}
                        class="h-6 w-6 items-center justify-center"
                      >
                        <Icon name="remove" size={13} />
                      </View>
                      <Text class="w-5 text-center font-label text-label-md tabular-nums text-on-surface">
                        {line().qty}
                      </Text>
                      <View
                        role="button"
                        accessibilityLabel={"Increase " + line().name}
                        onPress={() => setQty(line().key, line().qty + 1)}
                        class="h-6 w-6 items-center justify-center"
                      >
                        <Icon name="add" size={13} />
                      </View>
                    </View>
                    <Text class="w-20 text-right font-body text-body-md tabular-nums text-outline">
                      {money(line().price)}
                    </Text>
                    <Text class="w-24 text-right font-label text-label-md tabular-nums text-on-surface">
                      {money(line().price * line().qty)}
                    </Text>
                    <View
                      role="button"
                      accessibilityLabel={"Remove " + line().name}
                      onPress={() => setQty(line().key, 0)}
                      class="h-6 w-6 items-center justify-center rounded-sm hover:bg-error-container"
                    >
                      <Icon name="close" size={13} color="#6B5752" />
                    </View>
                  </View>
                )}
              </Each>

              <If when={lines().length === 0}>
                <View class="items-center justify-center gap-2 py-10">
                  <Icon name="receipt_long" size={26} color="#6B5752" />
                  <Text class="font-body text-body-md text-on-surface">
                    Add the first item
                  </Text>
                  <Text class="font-body text-body-sm text-outline">
                    Catering orders are entered here, not rung up on the register.
                  </Text>
                </View>
              </If>
            </View>

            <View class="gap-1.5 rounded-md border border-outline-variant bg-surface-container-lowest p-4">
              <Text class="font-label text-label-sm uppercase tracking-label text-outline">
                Order note
              </Text>
              <TextBox
                value={note()}
                onChange={(value) => note.set(value)}
                placeholder="Delivery instructions, contact, packaging…"
              />
            </View>
          </Scroll>
        </View>

        <View class="flex-col gap-3" style={{ flex: 4 }}>
          <View class="gap-3 rounded-md border border-outline-variant bg-surface-container-lowest p-4">
            <View class="border-b border-outline-variant pb-2">
              <Text class="font-headline text-title-md text-on-surface">Invoice summary</Text>
              <Text class="font-body text-body-sm text-outline">
                {terms() === "Paid"
                  ? "Settled now · card or cash"
                  : terms() === "Net 7"
                    ? "On account · due in 7 days"
                    : "On account · due in 15 days"}
              </Text>
            </View>

            <View class="gap-2 rounded-md border border-outline-variant bg-surface-container-low p-3">
              <View class="flex-row items-center justify-between">
                <Text class="font-body text-body-sm text-on-surface-variant">Subtotal</Text>
                <Text class="font-label text-label-md tabular-nums text-on-surface">
                  {money(sub())}
                </Text>
              </View>
              <View class="flex-row items-center justify-between">
                <Text class="font-body text-body-sm text-on-surface-variant">GST (8%)</Text>
                <Text class="font-label text-label-md tabular-nums text-on-surface">
                  {money(gst())}
                </Text>
              </View>
              <View class="flex-row items-center justify-between border-t border-outline-variant pt-2">
                <Text class="font-label text-label-md text-on-surface">Grand total</Text>
                <Text class="font-title text-title-lg tabular-nums text-on-surface">
                  {money(grand())}
                </Text>
              </View>
            </View>

            <Button
              label={saving() ? "Saving…" : "Save invoice & print"}
              icon="print"
              variant="primary"
              disabled={saving() || lines().length === 0}
              onPress={save}
            />

            <View class="flex-row items-center gap-1.5">
              <Icon name="info" size={14} color="#6B5752" />
              <Text class="flex-1 font-body text-body-sm text-outline">
                Saves the invoice and queues it for the ledger — no cash movement.
              </Text>
            </View>
          </View>

          <View class="gap-2 rounded-md border border-outline-variant bg-surface-container-low p-4">
            <Text class="font-label text-label-md text-on-surface">Saved drafts</Text>
            <Text class="font-body text-body-sm text-outline">
              Drafts stay on this screen until you press save. Closing the window
              loses them.
            </Text>
          </View>
        </View>
      </View>

      <If when={addOpen()}>
        <Modal onClose={() => addOpen.set(false)} width={520}>
          <View class="gap-2 border-b border-outline-variant p-4">
            <View class="flex-row items-center justify-between">
              <Text class="font-title text-title-lg text-on-surface">Add an item</Text>
              <View
                role="button"
                accessibilityLabel="Close item picker"
                onPress={() => addOpen.set(false)}
                class="h-8 w-8 items-center justify-center rounded-sm border border-outline-variant"
              >
                <Icon name="close" size={16} />
              </View>
            </View>
            <TextBox
              value={productQuery()}
              onChange={(value) => productQuery.set(value)}
              placeholder="Search the menu"
              icon="search"
            />
          </View>

          <Scroll class="flex-1" contentClass="p-2">
            <Each
              of={catalog().filter((product) => {
                const query = productQuery().trim().toLowerCase();
                return query === "" || product.name.toLowerCase().includes(query);
              })}
            >
              {(product) => (
                <View
                  role="button"
                  onPress={() => addProduct(product())}
                  class="flex-row items-center justify-between gap-2 rounded px-2.5 py-2 hover:bg-surface-container-low"
                >
                  <View class="gap-0">
                    <Text class="font-label text-label-md text-on-surface">
                      {product().name}
                    </Text>
                    <Text class="font-body text-body-sm text-outline">
                      {product().category} · {product().note}
                    </Text>
                  </View>
                  <Text class="font-label text-label-md tabular-nums text-on-surface">
                    {money(product().price)}
                  </Text>
                </View>
              )}
            </Each>
          </Scroll>
        </Modal>
      </If>
    </View>
  );
}
