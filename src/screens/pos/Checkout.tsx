import { computed, Scroll, signal, Text, View } from "nsh";
import { Icon } from "../../ui/Icon";
import { Button } from "../../ui/Button";
import {
  cart,
  cartCount,
  channel,
  completeSale,
  discountPercent,
  discountValue,
  guests,
  navigate,
  orderNote,
  activeCustomer,
  subtotal,
  tableLabel,
  tax,
  tip,
  tipBase,
  taxRate,
  total,
  type PaymentMethod,
} from "../../store";
import { money } from "../../format";

const methods: { id: PaymentMethod; icon: string; label: string; hint: string }[] = [
  { id: "Card", icon: "credit_card", label: "Card", hint: "Tap, chip or swipe" },
  { id: "Cash", icon: "payments", label: "Cash", hint: "Count & give change" },
  { id: "QR / Wallet", icon: "qr_code_2", label: "QR / Wallet", hint: "Apple Pay, Wallet" },
  { id: "Split", icon: "call_split", label: "Split bill", hint: "By item or amount" },
];

const keypad: string[][] = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["00", "0", "back"],
];

function Keypad(props: { onKey: (key: string) => void }) {
  return (
    <View class="gap-1.5">
      <Each of={keypad}>
        {(row) => (
          <View class="flex-row gap-1.5">
            <Each of={row()}>
              {(key) => (
                <View
                  role="button"
                  onPress={() => props.onKey(key())}
                  class="h-11 flex-1 items-center justify-center rounded border border-outline-variant bg-surface-container-low hover:bg-surface-container"
                >
                  <If
                    when={key() === "back"}
                    else={
                      <Text class="font-title text-title-lg tabular-nums text-on-surface">
                        {key()}
                      </Text>
                    }
                  >
                    <Icon name="backspace" size={18} />
                  </If>
                </View>
              )}
            </Each>
          </View>
        )}
      </Each>
    </View>
  );
}

export function CheckoutScreen() {
  const method = signal<PaymentMethod>("Cash");
  const cents = signal(4000);

  const tendered = computed(() => cents() / 100);
  const change = computed(() => Math.max(0, tendered() - total()));
  const short = computed(() => Math.max(0, total() - tendered()));

  const tenders = signal<{ id: number; method: string; amount: number }[]>([]);
  const tenderMethod = signal("Card");
  let tenderSeq = 0;
  const paidAmount = computed(
    () => Math.round(tenders().reduce((sum, tender) => sum + tender.amount, 0) * 100) / 100,
  );
  const remaining = computed(
    () => Math.max(0, Math.round((total() - paidAmount()) * 100) / 100),
  );
  const addTender = () => {
    const amount = Math.min(remaining(), cents() / 100);
    if (amount <= 0) return;
    tenderSeq += 1;
    tenders.update((list) => [...list, { id: tenderSeq, method: tenderMethod(), amount }]);
    cents.set(0);
  };

  const pressKey = (key: string) => {
    if (key === "back") {
      cents.update((value) => Math.floor(value / 10));
      return;
    }
    const digit = key === "00" ? "00" : key;
    const next = Number(String(cents()) + digit);
    if (Number.isFinite(next) && next <= 999999) cents.set(next);
  };

  const finish = () => {
    if (cartCount() === 0) return;
    if (method() === "Split") {
      if (remaining() > 0 || tenders().length === 0) return;
      completeSale(
        "Split",
        total(),
        tenders().map((tender) => ({ method: tender.method, amount: tender.amount })),
      );
    } else {
      completeSale(method(), method() === "Cash" ? tendered() : total());
    }
    navigate("invoice");
  };

  return (
    <View class="flex-1 flex-col gap-4 p-5 min-h-0">
      <View class="flex-row items-center justify-between gap-3">
        <View class="flex-row items-center gap-3">
          <View
            role="button"
            accessibilityLabel="Back to POS"
            onPress={() => {
              tip.set(0);
              navigate("register");
            }}
            class="h-10 w-10 items-center justify-center rounded border border-outline-variant bg-surface-container-lowest hover:bg-surface-container"
          >
            <Icon name="arrow_back" size={20} />
          </View>
          <View class="gap-0.5">
            <Text class="font-headline text-headline-lg text-on-surface">
              Checkout
            </Text>
            <Text class="font-body text-body-sm text-outline tabular-nums">
              Order #1049 · {channel()} · {tableLabel()} · {guests()} guests
            </Text>
          </View>
        </View>
        <View class="flex-row items-center gap-1.5 rounded-full bg-secondary-container px-3 py-2">
          <View class="h-2 w-2 rounded-full bg-secondary" />
          <Text class="font-label text-label-md text-on-secondary-container">
            Terminal T-02 connected
          </Text>
        </View>
      </View>

      <View class="flex-1 flex-row gap-5 min-h-0">
        {/* Order summary */}
        <View class="flex-col justify-between gap-3 rounded-md border border-outline-variant bg-surface-container-lowest p-4" style={{ flex: 5 }}>
          <Scroll class="flex-1" contentClass="gap-4">
            <View class="flex-row items-center justify-between">
              <Text class="font-title text-title-lg text-on-surface">
                Order summary
              </Text>
              <View class="rounded-sm bg-surface-container px-2 py-0.5">
                <Text class="font-label text-label-md tabular-nums text-on-surface-variant">
                  {cartCount()} items
                </Text>
              </View>
            </View>

            <View class="flex-row items-center gap-3 rounded-md border border-outline-variant bg-surface-container-low p-3">
              <If
                when={activeCustomer()}
                else={
                  <View class="h-9 w-9 items-center justify-center rounded-full bg-surface-container">
                    <Icon name="person" size={18} color="#6B5752" />
                  </View>
                }
              >
                {(customer) => (
                  <View class="h-9 w-9 items-center justify-center rounded-full bg-amber-container text-on-amber-container">
                    <Text class="font-label text-label-md">{customer().initials}</Text>
                  </View>
                )}
              </If>
              <View class="gap-0.5">
                <Text class="font-title text-title-md text-on-surface">
                  {activeCustomer()?.name ?? "Walk-in guest"}
                </Text>
                <Text class="font-body text-body-sm text-outline">
                  {activeCustomer()
                    ? activeCustomer()!.tier +
                      " member · " +
                      activeCustomer()!.stamps +
                      "/10 stamps"
                    : "No loyalty attached"}
                </Text>
              </View>
            </View>

            <View class="gap-3">
              <Each of={cart()}>
                {(line) => (
                  <View class="flex-row items-start justify-between gap-3">
                    <View class="flex-1 gap-0.5 min-w-0">
                      <Text class="font-title text-title-md text-on-surface">
                        <Text class="font-title text-title-md tabular-nums text-outline">
                          {line().qty}x{" "}
                        </Text>
                        {line().name}
                      </Text>
                      <Text class="font-body text-body-sm text-outline">
                        {line().modifiers.length
                          ? line().modifiers.map((modifier) => modifier.name).join(" · ")
                          : line().note}
                      </Text>
                    </View>
                    <Text class="font-title text-title-md tabular-nums text-on-surface">
                      {money(line().price * line().qty)}
                    </Text>
                  </View>
                )}
              </Each>
              <If when={cart().length === 0}>
                <Text class="font-body text-body-md text-outline">
                  The ticket is empty — add items on the register.
                </Text>
              </If>
            </View>

            <View class="gap-1 rounded-md border border-outline-variant bg-surface-container-low p-3">
              <Text class="font-label text-label-sm uppercase text-amber">
                Order note
              </Text>
              <Text class="font-body text-body-sm text-on-surface-variant">
                {orderNote() ||
                  "Birthday table — add a candle to the cheesecake and serve it last."}
              </Text>
            </View>
          </Scroll>

          <View class="gap-1.5 border-t border-outline-variant pt-4">
            <View class="flex-row justify-between">
              <Text class="font-body text-body-md text-on-surface-variant">
                Subtotal
              </Text>
              <Text class="font-body text-body-md tabular-nums text-on-surface-variant">
                {money(subtotal())}
              </Text>
            </View>
            <If when={discountValue() > 0}>
              <View class="flex-row justify-between">
                <Text class="font-body text-body-md text-secondary">
                  Discount · MORNING10
                </Text>
                <Text class="font-body text-body-md tabular-nums text-secondary">
                  −{money(discountValue())}
                </Text>
              </View>
            </If>
            <View class="flex-row justify-between">
              <Text class="font-body text-body-md text-on-surface-variant">
                Tax ({Math.round(taxRate * 100)}%)
              </Text>
              <Text class="font-body text-body-md tabular-nums text-on-surface-variant">
                {money(tax())}
              </Text>
            </View>
            <If when={tip() > 0}>
              <View class="flex-row justify-between">
                <Text class="font-body text-body-md text-on-surface-variant">Tip</Text>
                <Text class="font-body text-body-md tabular-nums text-on-surface-variant">
                  {money(tip())}
                </Text>
              </View>
            </If>
            <View class="flex-row items-center justify-between gap-2 pt-1">
              <Text class="font-body text-body-md text-on-surface-variant">Add tip</Text>
              <View class="flex-row gap-1">
                <Each of={[0, 10, 15, 20]}>
                  {(rate) => {
                    const amount = () =>
                      rate() === 0
                        ? 0
                        : Math.round(tipBase() * (rate() / 100) * 100) / 100;
                    return (
                      <View
                        role="button"
                        onPress={() => tip.set(amount())}
                        class={
                          "rounded-sm border px-2 py-0.5 " +
                          (tip() === amount()
                            ? "border-primary-container bg-surface-variant"
                            : "border-outline-variant bg-surface-container-low")
                        }
                      >
                        <Text class="font-label text-label-sm tabular-nums text-on-surface">
                          {rate() === 0 ? "None" : rate() + "%"}
                        </Text>
                      </View>
                    );
                  }}
                </Each>
              </View>
            </View>
            <View class="flex-row items-baseline justify-between border-t border-outline-variant pt-2">
              <Text class="font-title text-title-lg text-on-surface">
                Total due
              </Text>
              <Text class="font-title text-headline-lg tabular-nums text-on-surface">
                {money(total())}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment */}
        <View class="flex-col justify-between gap-3 rounded-md border border-outline-variant bg-surface-container-lowest p-4" style={{ flex: 7 }}>
          <Scroll class="flex-1" contentClass="gap-4">
            <View class="flex-row items-start justify-between gap-3">
              <View class="gap-0.5">
                <Text class="font-title text-title-lg text-on-surface">
                  Payment method
                </Text>
                <Text class="font-body text-body-sm text-outline">
                  Choose how the customer is paying
                </Text>
              </View>
              <View class="items-end">
                <Text class="font-body text-body-sm text-outline">
                  Amount due
                </Text>
                <Text class="font-title text-headline-lg tabular-nums text-primary-container">
                  {money(total())}
                </Text>
              </View>
            </View>

            <View class="flex-row gap-3">
              <Each of={methods}>
                {(option) => (
                  <View
                    role="button"
                    onPress={() => {
                      if (option().id === "Split") cents.set(0);
                      method.set(option().id);
                    }}
                    accessibilityState={{ selected: method() === option().id }}
                    class={
                      "flex-1 gap-1 rounded-md border p-3 " +
                      (method() === option().id
                        ? "border-2 border-primary-container bg-surface-variant"
                        : "border-outline-variant bg-surface-container-low hover:bg-surface-container")
                    }
                  >
                    <View class="w-full flex-row items-center justify-between">
                      <Icon
                        name={option().icon}
                        size={20}
                        color={method() === option().id ? "#932C10" : "#58423C"}
                      />
                      <If when={method() === option().id}>
                        <Icon name="check_circle" size={16} color="#932C10" />
                      </If>
                    </View>
                    <Text class="font-title text-title-md text-on-surface">
                      {option().label}
                    </Text>
                    <Text class="font-body text-body-sm text-outline">
                      {option().hint}
                    </Text>
                  </View>
                )}
              </Each>
            </View>

            <View class="flex-row gap-4 pt-1">
              <View class="flex-1 gap-2">
                <Text class="font-label text-label-md text-on-surface-variant">
                  {method() === "Split" ? "Amount" : "Cash received"}
                </Text>
                <View class="rounded-md border-2 border-primary-container bg-surface-container-lowest px-4 py-3">
                  <Text class="font-title text-headline-lg tabular-nums text-on-surface">
                    {money(tendered())}
                  </Text>
                </View>

                <If when={method() === "Split"}>
                  <View class="flex-row gap-1.5">
                    <Each of={["Cash", "Card", "Wallet"]}>
                      {(option) => (
                        <View
                          role="button"
                          accessibilityLabel={"Tender " + option()}
                          onPress={() => tenderMethod.set(option())}
                          class={
                            "flex-1 items-center justify-center rounded-sm border py-1.5 " +
                            (tenderMethod() === option()
                              ? "border-primary-container bg-surface-variant"
                              : "border-outline-variant bg-surface-container-low")
                          }
                        >
                          <Text class="font-label text-label-md text-on-surface">{option()}</Text>
                        </View>
                      )}
                    </Each>
                  </View>
                  <View class="flex-row gap-1.5">
                    <View
                      role="button"
                      onPress={() => cents.set(Math.round(remaining() * 100))}
                      class="flex-1 items-center justify-center rounded-sm border border-outline-variant bg-surface-container-low py-1.5"
                    >
                      <Text class="font-label text-label-md tabular-nums text-on-surface">
                        Remaining {money(remaining())}
                      </Text>
                    </View>
                    <View
                      role="button"
                      onPress={addTender}
                      class="flex-1 items-center justify-center rounded-sm bg-primary-container py-1.5"
                    >
                      <Text class="font-label text-label-md text-on-primary">Add payment</Text>
                    </View>
                  </View>
                </If>

                <If when={method() !== "Split"}>
                  <View class="flex-row gap-1.5">
                    <View
                      role="button"
                      onPress={() => cents.set(Math.round(total() * 100))}
                      class="flex-1 items-center justify-center rounded-sm border border-outline-variant bg-surface-container-low py-1.5"
                    >
                      <Text class="font-label text-label-md text-on-surface">Exact</Text>
                    </View>
                    <View
                      role="button"
                      onPress={() => cents.set(5000)}
                      class="flex-1 items-center justify-center rounded-sm border border-outline-variant bg-surface-container-low py-1.5"
                    >
                      <Text class="font-label text-label-md tabular-nums text-on-surface">$50</Text>
                    </View>
                    <View
                      role="button"
                      onPress={() => cents.set(10000)}
                      class="flex-1 items-center justify-center rounded-sm border border-outline-variant bg-surface-container-low py-1.5"
                    >
                      <Text class="font-label text-label-md tabular-nums text-on-surface">$100</Text>
                    </View>
                  </View>
                </If>

                <Keypad onKey={pressKey} />
              </View>

              <View class="flex-1 justify-between gap-3">
                <If when={method() === "Split"}>
                  <View class="gap-2">
                    <View class="gap-1 rounded-md border border-outline-variant bg-surface-container-low p-3">
                      <Text class="font-label text-label-sm uppercase text-outline">
                        Remaining
                      </Text>
                      <Text
                        class={
                          "font-title text-headline-lg tabular-nums " +
                          (remaining() > 0 ? "text-primary-container" : "text-secondary")
                        }
                      >
                        {money(remaining())}
                      </Text>
                    </View>
                    <View class="gap-1">
                      <Text class="font-label text-label-sm uppercase text-outline">
                        Payments
                      </Text>
                      <Each of={tenders()}>
                        {(tender) => (
                          <View class="flex-row items-center justify-between border-t border-outline-variant/60 pt-1.5">
                            <Text class="font-body text-body-md text-on-surface">
                              {tender().method}
                            </Text>
                            <View class="flex-row items-center gap-2">
                              <Text class="font-label text-label-md tabular-nums text-on-surface">
                                {money(tender().amount)}
                              </Text>
                              <View
                                role="button"
                                accessibilityLabel={"Remove " + tender().method + " payment"}
                                onPress={() =>
                                  tenders.update((list) =>
                                    list.filter((entry) => entry.id !== tender().id),
                                  )
                                }
                                class="h-5 w-5 items-center justify-center rounded-sm hover:bg-error-container"
                              >
                                <Icon name="close" size={12} color="#6B5752" />
                              </View>
                            </View>
                          </View>
                        )}
                      </Each>
                      <If when={tenders().length === 0}>
                        <Text class="font-body text-body-sm text-outline">
                          Enter an amount, pick Cash/Card/Wallet, then Add payment.
                        </Text>
                      </If>
                    </View>
                  </View>
                  <Text class="font-body text-body-sm text-outline">
                    Split payments settle together; change is not given in this mode.
                  </Text>
                </If>

                <If when={method() !== "Split"}>
                  <View class="gap-2">
                    <View class="gap-1 rounded-md border border-outline-variant bg-surface-container-low p-3">
                      <Text class="font-label text-label-sm uppercase text-outline">
                        Change due
                      </Text>
                      <Text class="font-title text-headline-lg tabular-nums text-secondary">
                        {money(change())}
                      </Text>
                    </View>
                    <If when={short() > 0}>
                      <View class="flex-row items-center gap-1.5 rounded-md border border-amber/30 bg-amber-container p-2.5">
                        <Icon name="info" size={16} color="#7E5700" />
                        <Text class="font-body text-body-sm text-on-amber-container">
                          {money(short())} still to collect
                        </Text>
                      </View>
                    </If>
                  </View>

                  <View class="gap-2">
                    <Text class="font-body text-body-sm text-outline">
                      {discountPercent() > 0
                        ? "MORNING10 applied · loyalty points post after payment."
                        : "Loyalty points post after payment."}
                    </Text>
                  </View>
                </If>
              </View>
            </View>
          </Scroll>

          <View class="gap-2 border-t border-outline-variant pt-3">
            <Button
              label={"Complete sale · " + money(total())}
              variant="primary"
              size="lg"
              iconRight="arrow_forward"
              onPress={finish}
              disabled={
                cartCount() === 0 ||
                (method() === "Cash" && short() > 0) ||
                (method() === "Split" && (remaining() > 0 || tenders().length === 0))
              }
            />
            <Text class="text-center font-body text-body-sm text-outline">
              F2 to complete · Esc to return to the register
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
