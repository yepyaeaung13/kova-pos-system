import { computed, Scroll, signal, Text, View } from "nsh";
import { Icon } from "../../ui/Icon";
import { Chip, StatusPill } from "../../ui/Badge";
import { ProductArt } from "../../ui/ProductArt";
import { TextBox } from "../../ui/Field";
import { Button } from "../../ui/Button";
import { Modal } from "../../ui/Modal";
import {
  activeCustomer,
  addToCart,
  cart,
  cartCount,
  catalog,
  channel,
  channelOptions,
  clearCart,
  customerQuery,
  discountFixed,
  discountKind,
  discountLabel,
  discountRate,
  discountValue,
  discardHeld,
  heldOrders,
  holdCurrentOrder,
  resetDiscount,
  resumeHeld,
  splitOff,
  guests,
  navigate,
  qtyOf,
  searchQuery,
  setQty,
  subtotal,
  tableLabel,
  tax,
  taxRate,
  total,
  updateLine,
  type CartModifier,
  type DiscountKind,
} from "../../store";
import {
  categories,
  customers,
  groupsFor,
  type Category,
  type ModifierGroup,
  type Product,
} from "../../data/mock";
import { money } from "../../format";

const allCategories: (Category | "All")[] = [
  "All",
  "Coffee",
  "Cold drinks",
  "Bakery",
  "Sandwiches",
];

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

/** The photo-first menu tile. */
function MenuTile(props: { id: string; onCustomise: (product: Product) => void }) {
  const product = catalog().find((p) => p.id === props.id)!;
  const soldOut = product.badge === "Sold out";
  const qty = qtyOf(product.id);
  const selected = qty > 0;
  const customisable = groupsFor(product).length > 0;

  return (
    <View
      role="button"
      disabled={soldOut}
      accessibilityLabel={soldOut ? product.name + " sold out" : "Add " + product.name}
      onPress={() => {
        if (soldOut) return;
        if (customisable) props.onCustomise(product);
        else addToCart(product.id);
      }}
      class={
        "flex-1 gap-2 rounded-md border p-2 " +
        (selected
          ? "border-primary-container bg-surface-container-lowest"
          : "border-outline-variant bg-surface-container-lowest") +
        (soldOut ? " opacity-100" : " hover:border-outline")
      }
    >
      <View style={{ position: "relative" }}>
        <ProductArt emoji={product.emoji} tint={product.tint} height={108} dim={soldOut} />
        <If when={selected && !soldOut}>
          <View
            class="h-6 w-6 items-center justify-center rounded-full bg-primary-container"
            style={{ position: "absolute", top: 8, left: 8 }}
          >
            <Text class="font-label text-label-sm tabular-nums text-on-primary">{qty}</Text>
          </View>
        </If>
        <If when={soldOut}>
          <View class="rounded-sm bg-inverse-surface px-2 py-0.5" style={{ position: "absolute", top: 8, left: 8 }}>
            <Text class="font-label text-label-sm text-inverse-on-surface">Sold out</Text>
          </View>
        </If>
      </View>

      <View class="gap-0.5 px-1">
        <Text
          class={
            "font-title text-title-md line-clamp-2 " +
            (soldOut ? "text-on-surface-variant" : "text-on-surface")
          }
        >
          {product.name}
        </Text>
        <Text class="font-body text-body-sm text-outline">{product.note}</Text>
      </View>

      <View class="flex-1" />

      <View class="flex-row items-center justify-between px-1 pt-1">
        <Text
          class={
            "font-title text-title-md tabular-nums " +
            (soldOut ? "text-on-surface-variant" : "text-on-surface")
          }
        >
          {money(product.price)}
        </Text>
        <View
          class={
            "h-7 w-7 items-center justify-center rounded-sm " +
            (soldOut
              ? "bg-surface-container text-outline"
              : selected
                ? "bg-primary-container text-on-primary"
                : "bg-surface-container text-on-surface")
          }
        >
          <Icon name={customisable && !soldOut ? "tune" : "add"} size={customisable ? 14 : 16} />
        </View>
      </View>
    </View>
  );
}

/** One line of the live ticket, with its quantity stepper. */
function TicketLine(props: {
  lineId: string;
  onEdit: (productId: string, lineId: string) => void;
}) {
  const line = () => cart().find((row) => row.id === props.lineId);
  return (
    <If when={line()}>
      {(row) => (
        <View class="flex-row items-center justify-between gap-2 pt-3">
          <View
            role="button"
            accessibilityLabel={"Edit " + row().name}
            onPress={() => props.onEdit(row().productId, row().id)}
            class="flex-1 flex-row items-center gap-2 min-w-0"
          >
            <ProductArt
              emoji={row().emoji}
              tint={row().tint}
              height={40}
              size={20}
              class="w-10 shrink-0"
            />
            <View class="flex-1 gap-0.5 min-w-0">
              <Text class="font-title text-title-md text-on-surface truncate">{row().name}</Text>
              <Text class="font-body text-body-sm text-outline truncate">
                {row().modifiers.length
                  ? row().modifiers.map((modifier) => modifier.name).join(" · ")
                  : row().note}
              </Text>
            </View>
          </View>
          <View class="items-end gap-1.5">
            <Text class="font-title text-title-md tabular-nums text-on-surface">
              {money(row().price * row().qty)}
            </Text>
            <View class="flex-row items-center gap-1 rounded-sm border border-outline-variant bg-surface-container-low px-1">
              <View
                role="button"
                accessibilityLabel={"Decrease " + row().name}
                onPress={() => setQty(row().id, row().qty - 1)}
                class="h-6 w-6 items-center justify-center"
              >
                <Icon name="remove" size={14} />
              </View>
              <Text class="w-4 text-center font-label text-label-md tabular-nums text-on-surface">
                {row().qty}
              </Text>
              <View
                role="button"
                accessibilityLabel={"Increase " + row().name}
                onPress={() => setQty(row().id, row().qty + 1)}
                class="h-6 w-6 items-center justify-center"
              >
                <Icon name="add" size={14} />
              </View>
            </View>
          </View>
        </View>
      )}
    </If>
  );
}

export function RegisterScreen() {
  const category = signal<Category | "All">("All");
  const sheet = signal<{ productId: string; lineId: string | null } | null>(null);
  const selection = signal<Record<string, string[]>>({});
  const picker = signal(false);
  const heldOpen = signal(false);
  const splitOpen = signal(false);
  const splitIds = signal<string[]>([]);
  const discountOpen = signal(false);
  const draftKind = signal<DiscountKind>("percent");
  const draftRate = signal(10);
  const draftFixed = signal(0);
  const draftLabel = signal("MORNING10");

  const openDiscount = () => {
    draftKind.set(discountKind());
    draftRate.set(discountRate());
    draftFixed.set(discountFixed());
    draftLabel.set(discountLabel());
    discountOpen.set(true);
  };

  const applyDiscount = () => {
    discountKind.set(draftKind());
    if (draftKind() === "percent") {
      discountRate.set(Math.max(0, Math.min(100, draftRate())));
    } else {
      discountFixed.set(Math.max(0, draftFixed()));
    }
    discountLabel.set(draftLabel().trim() || "Discount");
    discountOpen.set(false);
  };

  const draftValue = () =>
    draftKind() === "percent"
      ? Math.round(subtotal() * (Math.max(0, Math.min(100, draftRate())) / 100) * 100) / 100
      : Math.round(Math.min(subtotal(), Math.max(0, draftFixed())) * 100) / 100;

  const visible = computed(() => {
    const query = searchQuery().trim().toLowerCase();
    return catalog().filter((product) => {
      const inCategory = category() === "All" || product.category === category();
      const inQuery = query === "" || product.name.toLowerCase().includes(query);
      return inCategory && inQuery;
    });
  });

  const rows = computed(() => chunk(visible(), 4));

  const countFor = (name: Category | "All") =>
    name === "All"
      ? catalog().length
      : catalog().filter((product) => product.category === name).length;

  const sheetProduct = (): Product | null => {
    const open = sheet();
    return open ? catalog().find((product) => product.id === open.productId) ?? null : null;
  };

  const openCustomiser = (product: Product, lineId: string | null = null) => {
    const line = lineId ? cart().find((row) => row.id === lineId) : null;
    const initial: Record<string, string[]> = {};
    for (const group of groupsFor(product)) {
      const fromLine =
        line?.modifiers
          .filter((modifier) => modifier.groupId === group.id)
          .map((modifier) => modifier.optionId) ?? [];
      initial[group.id] =
        fromLine.length > 0
          ? fromLine
          : group.required && !group.multiple
            ? [group.options[0].id]
            : [];
    }
    selection.set(initial);
    sheet.set({ productId: product.id, lineId });
  };

  const toggleOption = (group: ModifierGroup, optionId: string) => {
    selection.update((current) => {
      const chosen = current[group.id] ?? [];
      if (group.multiple) {
        return {
          ...current,
          [group.id]: chosen.includes(optionId)
            ? chosen.filter((id) => id !== optionId)
            : [...chosen, optionId],
        };
      }
      return { ...current, [group.id]: [optionId] };
    });
  };

  const chosenModifiers = (product: Product): CartModifier[] => {
    const chosen = selection();
    const result: CartModifier[] = [];
    for (const group of groupsFor(product)) {
      for (const option of group.options) {
        if ((chosen[group.id] ?? []).includes(option.id)) {
          result.push({
            groupId: group.id,
            groupName: group.name,
            optionId: option.id,
            name: option.name,
            price: option.price,
          });
        }
      }
    }
    return result;
  };

  const sheetTotal = (): number => {
    const product = sheetProduct();
    if (!product) return 0;
    const extra = chosenModifiers(product).reduce((sum, modifier) => sum + modifier.price, 0);
    return Math.round((product.price + extra) * 100) / 100;
  };

  const applySheet = () => {
    const product = sheetProduct();
    const open = sheet();
    if (!product || !open) return;
    const modifiers = chosenModifiers(product);
    if (open.lineId) updateLine(open.lineId, modifiers);
    else addToCart(product.id, modifiers);
    sheet.set(null);
  };

  const member = () => activeCustomer();

  return (
    <View class="flex-1 flex-row" style={{ position: "relative" }}>
      {/* Menu */}
      <View class="flex-1 flex-col gap-4 p-4 min-w-0">
        <View class="flex-row items-center gap-2 flex-wrap">
          <Each of={allCategories}>
            {(name) => (
              <Chip
                label={name()}
                count={countFor(name())}
                selected={category() === name()}
                onPress={() => category.set(name())}
              />
            )}
          </Each>
        </View>

        <View class="flex-row items-baseline justify-between">
          <Text class="font-title text-title-lg text-on-surface">Popular right now</Text>
          <Text class="font-body text-body-sm text-outline tabular-nums">
            {visible().length} of {catalog().length} items
          </Text>
        </View>

        <Scroll class="flex-1" contentClass="gap-3 pb-2">
          <Each of={rows()}>
            {(row) => (
              <View class="flex-row gap-3">
                <Each of={row()}>
                  {(product) => (
                    <MenuTile id={product().id} onCustomise={(item) => openCustomiser(item)} />
                  )}
                </Each>
                <If when={row().length < 4}>
                  {() => (
                    <View class="flex-1 flex-row gap-3">
                      {Array.from({ length: 4 - row().length }).map(() => (
                        <View class="flex-1" />
                      ))}
                    </View>
                  )}
                </If>
              </View>
            )}
          </Each>
          <If when={visible().length === 0}>
            <View class="items-center justify-center gap-2 py-16">
              <Icon name="search_off" size={32} color="#6B5752" />
              <Text class="font-title text-title-md text-on-surface">
                Nothing matches that search
              </Text>
              <Text class="font-body text-body-sm text-outline">
                Try another name, or clear the filters.
              </Text>
            </View>
          </If>
        </Scroll>
      </View>

      {/* Live ticket */}
      <View
        class="shrink-0 flex-col justify-between border-l border-outline-variant bg-surface-container-lowest"
        style={{ width: 340 }}
      >
        <Scroll class="flex-1" contentClass="p-4 gap-3">
          <View class="flex-row items-start justify-between gap-3">
            <View class="gap-0.5">
              <View class="flex-row items-center gap-2">
                <Text class="font-headline text-headline-md tabular-nums text-on-surface">
                  Order #1049
                </Text>
                <If when={heldOrders().length > 0}>
                  <View
                    role="button"
                    accessibilityLabel="Open held orders"
                    onPress={() => heldOpen.set(true)}
                    class="flex-row items-center gap-1 rounded-full bg-amber-container px-2 py-0.5"
                  >
                    <Icon name="pause_circle" size={13} />
                    <Text class="font-label text-label-sm text-on-amber-container">
                      {heldOrders().length} held
                    </Text>
                  </View>
                </If>
              </View>
              <View
                role="button"
                accessibilityLabel="Choose table"
                onPress={() => navigate("tables")}
                class="flex-row items-center gap-1"
              >
                <Text class="font-body text-body-sm text-outline">
                  {tableLabel()} · {guests()} guests · Opened 9:12 AM
                </Text>
                <Icon name="expand_more" size={13} color="#6B5752" />
              </View>
            </View>
            <View class="flex-row items-center gap-1">
              <View
                role="button"
                accessibilityLabel="Order options"
                class="h-8 w-8 items-center justify-center rounded-sm border border-outline-variant text-on-surface-variant hover:bg-surface-container"
              >
                <Icon name="more_horiz" size={18} />
              </View>
              <View
                role="button"
                accessibilityLabel="Clear order"
                onPress={() => clearCart()}
                class="h-8 w-8 items-center justify-center rounded-sm border border-outline-variant text-error hover:bg-error-container"
              >
                <Icon name="delete_outline" size={18} />
              </View>
            </View>
          </View>

          <View class="flex-row gap-1 rounded bg-surface-container-low p-1">
            <Each of={channelOptions}>
              {(option) => (
                <View
                  role="button"
                  onPress={() => channel.set(option())}
                  class={
                    "flex-1 items-center justify-center rounded-sm py-2 " +
                    (channel() === option()
                      ? "border border-outline-variant bg-surface-container-lowest"
                      : "")
                  }
                >
                  <Text
                    class={
                      "font-label text-label-md " +
                      (channel() === option()
                        ? "text-on-surface"
                        : "text-on-surface-variant")
                    }
                  >
                    {option()}
                  </Text>
                </View>
              )}
            </Each>
          </View>

          <View
            role="button"
            onPress={() => {
              customerQuery.set("");
              picker.set(true);
            }}
            accessibilityLabel="Choose customer"
            class="flex-row items-center justify-between rounded-md border border-outline-variant bg-surface-container-low p-3 hover:bg-surface-container"
          >
            <View class="flex-row items-center gap-3 min-w-0">
              <If
                when={member()}
                else={
                  <View class="h-9 w-9 items-center justify-center rounded-full bg-surface-container">
                    <Icon name="person" size={18} color="#6B5752" />
                  </View>
                }
              >
                {(customer) => (
                  <View class="h-9 w-9 items-center justify-center rounded-full bg-amber-container">
                    <Text class="font-label text-label-md text-on-amber-container">
                      {customer().initials}
                    </Text>
                  </View>
                )}
              </If>
              <View class="gap-0.5 min-w-0">
                <Text class="font-title text-title-md text-on-surface truncate">
                  {member()?.name ?? "Walk-in guest"}
                </Text>
                <Text class="font-body text-body-sm text-outline">
                  {member()
                    ? member()!.tier + " member · " + member()!.stamps + "/10 stamps"
                    : "Add a member to earn points"}
                </Text>
              </View>
            </View>
            <Icon name="chevron_right" size={18} color="#6B5752" />
          </View>

          <View class="gap-0">
            <Each of={cart()}>
              {(line) => (
                <TicketLine
                  lineId={line().id}
                  onEdit={(productId, lineId) => {
                    const product = catalog().find((entry) => entry.id === productId);
                    if (product && groupsFor(product).length > 0) openCustomiser(product, lineId);
                  }}
                />
              )}
            </Each>
            <If when={cart().length === 0}>
              <View class="items-center gap-2 py-10">
                <Icon name="shopping_basket" size={28} color="#6B5752" />
                <Text class="font-body text-body-sm text-outline">
                  Tap a menu item to start the order.
                </Text>
              </View>
            </If>
          </View>
        </Scroll>

        <View class="gap-3 border-t border-outline-variant p-4">
          <If when={discountValue() > 0}>
            <View class="flex-row items-center justify-between rounded bg-secondary-container px-3 py-2">
              <View class="flex-row items-center gap-1.5 min-w-0">
                <Icon name="sell" size={16} />
                <Text class="font-label text-label-md text-on-secondary-container truncate">
                  {discountLabel()} ·{" "}
                  {discountKind() === "percent"
                    ? discountRate() + "% off"
                    : money(discountFixed()) + " off"}
                </Text>
              </View>
              <View class="flex-row items-center gap-1">
                <View
                  role="button"
                  accessibilityLabel="Edit discount"
                  onPress={openDiscount}
                  class="p-0.5"
                >
                  <Icon name="edit" size={14} />
                </View>
                <View
                  role="button"
                  accessibilityLabel="Remove discount"
                  onPress={resetDiscount}
                  class="p-0.5"
                >
                  <Icon name="close" size={16} />
                </View>
              </View>
            </View>
          </If>
          <If when={discountValue() === 0}>
            <View
              role="button"
              accessibilityLabel="Add discount"
              onPress={openDiscount}
              class="flex-row items-center justify-between rounded border border-dashed border-outline-variant px-3 py-2 hover:bg-surface-container-low"
            >
              <View class="flex-row items-center gap-1.5">
                <Icon name="sell" size={16} color="#6B5752" />
                <Text class="font-label text-label-md text-on-surface-variant">
                  Add discount
                </Text>
              </View>
              <Icon name="add" size={16} color="#6B5752" />
            </View>
          </If>

          <View class="gap-1.5">
            <View class="flex-row justify-between">
              <Text class="font-body text-body-md text-on-surface-variant">Subtotal</Text>
              <Text class="font-body text-body-md tabular-nums text-on-surface-variant">
                {money(subtotal())}
              </Text>
            </View>
            <If when={discountValue() > 0}>
              <View class="flex-row justify-between">
                <Text class="font-body text-body-md text-secondary">Discount</Text>
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
            <View class="flex-row items-baseline justify-between border-t border-outline-variant pt-2">
              <Text class="font-title text-title-lg text-on-surface">Total</Text>
              <Text class="font-title text-headline-md tabular-nums text-on-surface">
                {money(total())}
              </Text>
            </View>
          </View>

          <View class="flex-row items-center gap-2">
            <View
              role="button"
              accessibilityLabel="Hold order"
              onPress={() => holdCurrentOrder()}
              class="h-11 w-11 items-center justify-center rounded border border-outline-variant bg-surface-container-low text-on-surface hover:bg-surface-container"
            >
              <Icon name="pause" size={20} />
            </View>
            <View
              role="button"
              accessibilityLabel="Split bill"
              onPress={() => {
                splitIds.set([]);
                splitOpen.set(true);
              }}
              class="h-11 w-11 items-center justify-center rounded border border-outline-variant bg-surface-container-low text-on-surface hover:bg-surface-container"
            >
              <Icon name="call_split" size={20} />
            </View>
            <View
              role="button"
              onPress={() => {
                if (cartCount() > 0) navigate("checkout");
              }}
              class="h-11 flex-1 flex-row items-center justify-center gap-2 rounded bg-primary-container px-4 hover:bg-primary"
            >
              <Text class="font-label text-label-lg tabular-nums text-on-primary">
                Charge {money(total())}
              </Text>
              <Icon name="arrow_forward" size={18} />
            </View>
          </View>
        </View>
      </View>

      {/* Modifier / options sheet */}
      <If when={sheet()}>
        {() => {
          const product = sheetProduct();
          if (!product) return null;
          return (
            <Modal onClose={() => sheet.set(null)} width={520}>
              <View class="gap-1 border-b border-outline-variant p-4">
                <View class="flex-row items-center justify-between gap-3">
                  <View class="flex-row items-center gap-2.5">
                    <ProductArt
                      emoji={product.emoji}
                      tint={product.tint}
                      height={40}
                      size={20}
                      class="w-10"
                    />
                    <View class="gap-0">
                      <Text class="font-title text-title-lg text-on-surface">{product.name}</Text>
                      <Text class="font-body text-body-sm text-outline">
                        Base {money(product.price)} · per unit
                      </Text>
                    </View>
                  </View>
                  <View
                    role="button"
                    accessibilityLabel="Close options"
                    onPress={() => sheet.set(null)}
                    class="h-8 w-8 items-center justify-center rounded-sm border border-outline-variant"
                  >
                    <Icon name="close" size={16} />
                  </View>
                </View>
              </View>

              <Scroll class="flex-1" contentClass="p-4 gap-4">
                <Each of={groupsFor(product)}>
                  {(group) => (
                    <View class="gap-2">
                      <View class="flex-row items-center justify-between">
                        <Text class="font-label text-label-md uppercase tracking-label text-outline">
                          {group().name}
                        </Text>
                        <Text class="font-body text-body-sm text-outline">
                          {group().required ? "Required" : "Optional"}
                          {group().multiple ? " · choose any" : ""}
                        </Text>
                      </View>
                      <View class="gap-1">
                        <Each of={group().options}>
                          {(option) => {
                            const checked = () =>
                              (selection()[group().id] ?? []).includes(option().id);
                            return (
                              <View
                                role="button"
                                onPress={() => toggleOption(group(), option().id)}
                                class={
                                  "flex-row items-center justify-between gap-2 rounded border px-3 py-2 " +
                                  (checked()
                                    ? "border-primary-container bg-surface-variant"
                                    : "border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low")
                                }
                              >
                                <View class="flex-row items-center gap-2.5">
                                  <View
                                    class={
                                      "h-4 w-4 items-center justify-center border " +
                                      (group().multiple
                                        ? "rounded-sm"
                                        : "rounded-full") +
                                      " " +
                                      (checked()
                                        ? "border-primary bg-primary"
                                        : "border-outline-variant")
                                    }
                                  >
                                    <If when={checked()}>
                                      <Icon name="check" size={11} color="#FFFFFF" />
                                    </If>
                                  </View>
                                  <Text class="font-body text-body-md text-on-surface">
                                    {option().name}
                                  </Text>
                                </View>
                                <Text class="font-label text-label-md tabular-nums text-outline">
                                  {option().price === 0
                                    ? "Included"
                                    : (option().price > 0 ? "+" : "−") +
                                      money(Math.abs(option().price))}
                                </Text>
                              </View>
                            );
                          }}
                        </Each>
                      </View>
                    </View>
                  )}
                </Each>
              </Scroll>

              <View class="flex-row items-center justify-between gap-3 border-t border-outline-variant p-4">
                <View class="gap-0">
                  <Text class="font-body text-body-sm text-outline">Unit price</Text>
                  <Text class="font-title text-title-lg tabular-nums text-on-surface">
                    {money(sheetTotal())}
                  </Text>
                </View>
                <View class="flex-row items-center gap-2">
                  <If when={sheet()?.lineId}>
                    <View class="rounded-full bg-surface-container px-2 py-0.5">
                      <Text class="font-label text-label-sm text-on-surface-variant">
                        Editing line
                      </Text>
                    </View>
                  </If>
                  <View
                    role="button"
                    onPress={applySheet}
                    class="h-10 flex-row items-center justify-center gap-2 rounded bg-primary-container px-4 hover:bg-primary"
                  >
                    <Text class="font-label text-label-lg text-on-primary">
                      {sheet()?.lineId ? "Update line" : "Add to order"}
                    </Text>
                    <Icon name="arrow_forward" size={16} />
                  </View>
                </View>
              </View>
            </Modal>
          );
        }}
      </If>

      {/* Customer picker */}
      <If when={picker()}>
        <Modal onClose={() => picker.set(false)} width={520}>
          <View class="gap-3 border-b border-outline-variant p-4">
            <View class="flex-row items-center justify-between">
              <View class="gap-0">
                <Text class="font-title text-title-lg text-on-surface">Attach a customer</Text>
                <Text class="font-body text-body-sm text-outline">
                  Loyalty stamps and points follow the sale
                </Text>
              </View>
              <View
                role="button"
                accessibilityLabel="Close customer picker"
                onPress={() => picker.set(false)}
                class="h-8 w-8 items-center justify-center rounded-sm border border-outline-variant"
              >
                <Icon name="close" size={16} />
              </View>
            </View>
            <TextBox
              value={customerQuery()}
              onChange={(value) => customerQuery.set(value)}
              placeholder="Search members by name or phone"
              icon="search"
            />
          </View>

          <Scroll class="flex-1" contentClass="p-2">
            <View
              role="button"
              accessibilityLabel="Walk-in guest"
              onPress={() => {
                activeCustomer.set(null);
                picker.set(false);
              }}
              class="flex-row items-center gap-3 rounded px-2.5 py-2.5 hover:bg-surface-container-low"
            >
              <View class="h-9 w-9 items-center justify-center rounded-full bg-surface-container">
                <Icon name="person" size={18} color="#6B5752" />
              </View>
              <View class="flex-1 gap-0">
                <Text class="font-title text-title-md text-on-surface">Walk-in guest</Text>
                <Text class="font-body text-body-sm text-outline">No loyalty attached</Text>
              </View>
              <If when={member() === null}>
                <StatusPill label="Selected" tone="neutral" />
              </If>
            </View>

            <Each
              of={customers.filter((customer) => {
                const query = customerQuery().trim().toLowerCase();
                return (
                  query === "" ||
                  customer.name.toLowerCase().includes(query) ||
                  customer.phone.includes(query)
                );
              })}
            >
              {(customer) => (
                <View
                  role="button"
                  onPress={() => {
                    activeCustomer.set(customer());
                    picker.set(false);
                  }}
                  class={
                    "flex-row items-center gap-3 rounded px-2.5 py-2.5 " +
                    (member()?.id === customer().id
                      ? "bg-surface-variant"
                      : "hover:bg-surface-container-low")
                  }
                >
                  <View
                    class={
                      "h-9 w-9 items-center justify-center rounded-full " +
                      (customer().tier === "Gold"
                        ? "bg-amber-container"
                        : customer().tier === "Silver"
                          ? "bg-surface-container"
                          : "bg-plum-container")
                    }
                  >
                    <Text class="font-label text-label-md text-on-surface">
                      {customer().initials}
                    </Text>
                  </View>
                  <View class="flex-1 gap-0 min-w-0">
                    <Text class="font-title text-title-md text-on-surface truncate">
                      {customer().name}
                    </Text>
                    <Text class="font-body text-body-sm text-outline truncate">
                      {customer().tier} · {customer().stamps}/10 stamps · {customer().phone}
                    </Text>
                  </View>
                  <If when={member()?.id === customer().id}>
                    <Icon name="check_circle" size={18} color="#932C10" />
                  </If>
                </View>
              )}
            </Each>
          </Scroll>

          <View class="flex-row items-center justify-between border-t border-outline-variant px-4 py-3">
            <Text class="font-body text-body-sm text-outline">
              Members earn 1 point per $1 spent.
            </Text>
            <View class="flex-row items-center gap-2">
              <Icon name="person_add" size={16} color="#6B5752" />
              <Text class="font-label text-label-md text-primary">New member</Text>
            </View>
          </View>
        </Modal>
      </If>

      {/* Held orders */}
      <If when={heldOpen()}>
        <Modal onClose={() => heldOpen.set(false)} width={520}>
          <View class="gap-1 border-b border-outline-variant p-4">
            <View class="flex-row items-center justify-between">
              <View class="gap-0">
                <Text class="font-title text-title-lg text-on-surface">Held orders</Text>
                <Text class="font-body text-body-sm text-outline">
                  Parked tickets stay here for this shift
                </Text>
              </View>
              <View
                role="button"
                accessibilityLabel="Close held orders"
                onPress={() => heldOpen.set(false)}
                class="h-8 w-8 items-center justify-center rounded-sm border border-outline-variant"
              >
                <Icon name="close" size={16} />
              </View>
            </View>
          </View>

          <Scroll class="flex-1" contentClass="p-3 gap-2">
            <Each of={heldOrders()}>
              {(order) => (
                <View class="gap-2 rounded border border-outline-variant p-3">
                  <View class="flex-row items-start justify-between gap-2">
                    <View class="gap-0 min-w-0">
                      <Text class="font-title text-title-md tabular-nums text-on-surface">
                        {order().label}
                      </Text>
                      <Text class="font-body text-body-sm text-outline">
                        {order().table} · {order().channel} · {order().lines.length} lines ·{" "}
                        {order().heldAt.split(" · ")[1] ?? ""}
                      </Text>
                    </View>
                    <Text class="font-title text-title-md tabular-nums text-on-surface">
                      {money(order().total)}
                    </Text>
                  </View>
                  <View class="flex-row items-center gap-2">
                    <Button
                      label="Resume"
                      size="sm"
                      variant="primary"
                      onPress={() => {
                        resumeHeld(order().id);
                        heldOpen.set(false);
                      }}
                    />
                    <Button
                      label="Discard"
                      size="sm"
                      variant="ghost"
                      onPress={() => discardHeld(order().id)}
                    />
                  </View>
                </View>
              )}
            </Each>
            <If when={heldOrders().length === 0}>
              <View class="items-center justify-center gap-2 py-10">
                <Icon name="pause_circle" size={26} color="#6B5752" />
                <Text class="font-body text-body-md text-on-surface">No held orders</Text>
                <Text class="font-body text-body-sm text-outline">
                  The pause button parks the open ticket here.
                </Text>
              </View>
            </If>
          </Scroll>
        </Modal>
      </If>

      {/* Discount editor */}
      <If when={discountOpen()}>
        <Modal onClose={() => discountOpen.set(false)} width={460} height="64%">
          <View class="gap-1 border-b border-outline-variant p-4">
            <View class="flex-row items-center justify-between">
              <View class="gap-0">
                <Text class="font-title text-title-lg text-on-surface">Discount</Text>
                <Text class="font-body text-body-sm text-outline">
                  Applies to the whole ticket
                </Text>
              </View>
              <View
                role="button"
                accessibilityLabel="Close discount"
                onPress={() => discountOpen.set(false)}
                class="h-8 w-8 items-center justify-center rounded-sm border border-outline-variant"
              >
                <Icon name="close" size={16} />
              </View>
            </View>
          </View>

          <Scroll class="flex-1" contentClass="p-4 gap-3">
            <View class="flex-row gap-1 rounded-sm bg-surface-container p-1">
              <View
                role="button"
                onPress={() => draftKind.set("percent")}
                class={
                  "flex-1 items-center justify-center rounded-sm py-1.5 " +
                  (draftKind() === "percent" ? "bg-surface-container-lowest" : "")
                }
              >
                <Text class="font-label text-label-md text-on-surface">Percent</Text>
              </View>
              <View
                role="button"
                onPress={() => draftKind.set("fixed")}
                class={
                  "flex-1 items-center justify-center rounded-sm py-1.5 " +
                  (draftKind() === "fixed" ? "bg-surface-container-lowest" : "")
                }
              >
                <Text class="font-label text-label-md text-on-surface">Amount off</Text>
              </View>
            </View>

            <View class="gap-1.5">
              <Text class="font-label text-label-md text-on-surface-variant">
                {draftKind() === "percent" ? "Percentage" : "Amount"}
              </Text>
              <TextBox
                value={String(draftKind() === "percent" ? draftRate() : draftFixed())}
                onChange={(value) => {
                  const amount = Number(value) || 0;
                  if (draftKind() === "percent") draftRate.set(amount);
                  else draftFixed.set(amount);
                }}
              />
            </View>

            <If when={draftKind() === "percent"}>
              <View class="flex-row gap-1.5">
                <Each of={[5, 10, 15, 20]}>
                  {(rate) => (
                    <View
                      role="button"
                      onPress={() => draftRate.set(rate())}
                      class={
                        "flex-1 items-center justify-center rounded-sm border py-1.5 " +
                        (draftRate() === rate()
                          ? "border-primary-container bg-surface-variant"
                          : "border-outline-variant bg-surface-container-lowest")
                      }
                    >
                      <Text class="font-label text-label-md tabular-nums text-on-surface">
                        {rate()}%
                      </Text>
                    </View>
                  )}
                </Each>
              </View>
            </If>

            <View class="gap-1.5">
              <Text class="font-label text-label-md text-on-surface-variant">Label</Text>
              <TextBox value={draftLabel()} onChange={(value) => draftLabel.set(value)} />
            </View>

            <View class="flex-row items-center justify-between rounded border border-outline-variant bg-surface-container-low px-3 py-2">
              <Text class="font-body text-body-md text-on-surface-variant">This ticket</Text>
              <Text class="font-title text-title-md tabular-nums text-on-surface">
                −{money(draftValue())}
              </Text>
            </View>
          </Scroll>

          <View class="flex-row items-center justify-between gap-2 border-t border-outline-variant p-4">
            <Button
              label="Remove"
              variant="ghost"
              onPress={() => {
                resetDiscount();
                discountOpen.set(false);
              }}
            />
            <Button label="Apply discount" variant="primary" icon="check" onPress={applyDiscount} />
          </View>
        </Modal>
      </If>

      {/* Split ticket */}
      <If when={splitOpen()}>
        <Modal onClose={() => splitOpen.set(false)} width={500} height="72%">
          <View class="gap-1 border-b border-outline-variant p-4">
            <View class="flex-row items-center justify-between">
              <View class="gap-0">
                <Text class="font-title text-title-lg text-on-surface">Split ticket</Text>
                <Text class="font-body text-body-sm text-outline">
                  Move items onto their own ticket; the rest stays here.
                </Text>
              </View>
              <View
                role="button"
                accessibilityLabel="Close split"
                onPress={() => splitOpen.set(false)}
                class="h-8 w-8 items-center justify-center rounded-sm border border-outline-variant"
              >
                <Icon name="close" size={16} />
              </View>
            </View>
          </View>

          <Scroll class="flex-1" contentClass="p-3 gap-1">
            <Each of={cart()}>
              {(line) => {
                const checked = () => splitIds().includes(line().id);
                return (
                  <View
                    role="button"
                    accessibilityLabel={"Split " + line().name}
                    onPress={() =>
                      splitIds.update((ids) =>
                        checked()
                          ? ids.filter((id) => id !== line().id)
                          : [...ids, line().id],
                      )
                    }
                    class={
                      "flex-row items-center justify-between gap-2 rounded border px-3 py-2 " +
                      (checked()
                        ? "border-primary-container bg-surface-variant"
                        : "border-outline-variant bg-surface-container-lowest")
                    }
                  >
                    <View class="flex-row items-center gap-2.5 min-w-0">
                      <View
                        class={
                          "h-4 w-4 items-center justify-center rounded-sm border " +
                          (checked()
                            ? "border-primary bg-primary"
                            : "border-outline-variant")
                        }
                      >
                        <If when={checked()}>
                          <Icon name="check" size={11} color="#FFFFFF" />
                        </If>
                      </View>
                      <View class="gap-0 min-w-0">
                        <Text class="font-title text-title-md text-on-surface truncate">
                          {line().name}
                        </Text>
                        <Text class="font-body text-body-sm text-outline truncate">
                          {line().qty} × {money(line().price)}
                          {line().modifiers.length
                            ? " · " + line().modifiers.map((m) => m.name).join(" · ")
                            : ""}
                        </Text>
                      </View>
                    </View>
                    <Text class="font-label text-label-md tabular-nums text-on-surface">
                      {money(line().price * line().qty)}
                    </Text>
                  </View>
                );
              }}
            </Each>
          </Scroll>

          <View class="flex-row items-center justify-between gap-3 border-t border-outline-variant p-4">
            <View class="gap-0">
              <Text class="font-body text-body-sm text-outline">
                {splitIds().length} of {cart().length} items
              </Text>
              <Text class="font-title text-title-md tabular-nums text-on-surface">
                {money(
                  Math.round(
                    cart()
                      .filter((line) => splitIds().includes(line.id))
                      .reduce((sum, line) => sum + line.price * line.qty, 0) * 100,
                  ) / 100,
                )}
              </Text>
            </View>
            <View
              role="button"
              onPress={() => {
                if (splitOff(splitIds()) > 0) splitOpen.set(false);
              }}
              class={
                "h-10 flex-row items-center justify-center gap-2 rounded px-4 " +
                (splitIds().length === 0 || splitIds().length === cart().length
                  ? "bg-surface-container text-outline"
                  : "bg-primary-container text-on-primary hover:bg-primary")
              }
            >
              <Icon name="call_split" size={16} />
              <Text class="font-label text-label-lg text-on-primary">
                Split off {splitIds().length}{" "}
                {splitIds().length === 1 ? "item" : "items"}
              </Text>
            </View>
          </View>
        </Modal>
      </If>
    </View>
  );
}
