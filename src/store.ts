import { computed, signal } from "nsh";
import {
  customers,
  groupsFor,
  products,
  type Customer,
  type OrderStatus,
  type Product,
  type SaleRecord,
} from "./data/mock";
import { initialTables, type DiningTable } from "./data/tables";
import {
  stockItems,
  type Adjustment,
  type Grn,
  type StockItem,
  type StockStatus,
} from "./data/ops";
import {
  allocateInvoiceNo,
  getConfig,
  loadInventory,
  loadProducts,
  markOrder,
  recentSaleRows,
  setConfig,
  writeSale,
  type ExpenseRow,
  type JournalRow,
  type VendorBillRow,
} from "./db/repo";

export type AppId = "pos" | "inventory" | "accounting";

export interface Route {
  app: AppId;
  screen: string;
}

/** The app's current place: which micro-app and which of its screens. */
export const route = signal<Route>({ app: "pos", screen: "register" });

export function navigate(screen: string): void {
  route.update((current) => ({ app: current.app, screen }));
}

export function switchApp(app: AppId): void {
  route.set({ app, screen: app === "pos" ? "register" : "overview" });
}

/** The workspace search box; screens read it to filter their own lists. */
export const searchQuery = signal("");

export const cashier = {
  name: "Sara Ahmed",
  initials: "SA",
  role: "Cashier",
  branch: "Gulberg Café",
  terminal: "GUL-T01",
  shiftStarted: "8:00 AM",
};

export type Channel = "Dine-in" | "Takeaway" | "Delivery";

export const channelOptions: Channel[] = ["Dine-in", "Takeaway", "Delivery"];

export interface CartModifier {
  groupId: string;
  groupName: string;
  optionId: string;
  name: string;
  price: number;
}

export interface CartLine {
  id: string;
  productId: string;
  name: string;
  basePrice: number;
  price: number;
  qty: number;
  note: string;
  emoji: string;
  tint: string;
  modifiers: CartModifier[];
  /** Identifies the same product with the same options, for merging. */
  signature: string;
}

/** The live menu, seeded from the mock list and refreshed from SQLite. */
export const catalog = signal<Product[]>(products);

const byId = (id: string): Product | undefined =>
  catalog().find((product) => product.id === id);

export function updateProduct(id: string, patch: Partial<Product>): void {
  catalog.update((list) =>
    list.map((product) => (product.id === id ? { ...product, ...patch } : product)),
  );
}

export function addProduct(product: Product): void {
  catalog.update((list) => {
    const exists = list.some((entry) => entry.id === product.id);
    return exists
      ? list.map((entry) => (entry.id === product.id ? product : entry))
      : [...list, product];
  });
}

/** Replaces the catalog with the rows stored in SQLite, when there are any. */
export async function hydrateCatalog(): Promise<void> {
  try {
    const rows = await loadProducts();
    if (rows.length === 0) return;
    catalog.set(
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        category: row.category as Product["category"],
        price: Number(row.price_cents) / 100,
        note: row.note,
        emoji: row.emoji,
        tint: row.tint,
        badge: row.badge ?? undefined,
        soldToday: Number(row.sold_today),
      })),
    );
  } catch {
    // The mock catalog stays usable without the database.
  }
}

let lineSeq = 0;

function nextLineId(): string {
  lineSeq += 1;
  return "l_" + lineSeq + "_" + Math.random().toString(36).slice(2, 6);
}

function signatureOf(productId: string, modifiers: CartModifier[]): string {
  return (
    productId +
    "#" +
    modifiers
      .map((modifier) => modifier.groupId + ":" + modifier.optionId)
      .sort()
      .join("|")
  );
}

function priceWith(product: Product, modifiers: CartModifier[]): number {
  return (
    Math.round(
      (product.price + modifiers.reduce((sum, modifier) => sum + modifier.price, 0)) * 100,
    ) / 100
  );
}

function lineOf(id: string, qty: number, modifiers: CartModifier[] = []): CartLine {
  const product = byId(id)!;
  return {
    id: nextLineId(),
    productId: product.id,
    name: product.name,
    basePrice: product.price,
    price: priceWith(product, modifiers),
    qty,
    note: product.note,
    emoji: product.emoji,
    tint: product.tint,
    modifiers,
    signature: signatureOf(product.id, modifiers),
  };
}

/** The default choice of every required single-select group. */
export function defaultModifiers(product: Product): CartModifier[] {
  return groupsFor(product)
    .filter((group) => group.required && !group.multiple)
    .map((group) => {
      const option = group.options[0];
      return {
        groupId: group.id,
        groupName: group.name,
        optionId: option.id,
        name: option.name,
        price: option.price,
      };
    });
}

/** The order being rung up, shared by the register and the checkout. */
export const cart = signal<CartLine[]>([
  lineOf("p-01", 2),
  lineOf("p-05", 1),
  lineOf("p-07", 1),
]);

export const channel = signal<Channel>("Dine-in");
export const tableLabel = signal("Table 4");
export const guests = signal(2);
export type DiscountKind = "percent" | "fixed";

export const discountKind = signal<DiscountKind>("percent");
export const discountRate = signal(10);
export const discountFixed = signal(0);
export const discountLabel = signal("MORNING10");
export const orderNote = signal("");

/** The member attached to the open ticket, if any. */
export const activeCustomer = signal<Customer | null>(customers[0]);
export const customerQuery = signal("");

export const cartCount = computed(() => cart().reduce((sum, line) => sum + line.qty, 0));

export const subtotal = computed(() =>
  Math.round(cart().reduce((sum, line) => sum + line.price * line.qty, 0) * 100) / 100,
);

export const taxRate = 0.08;

export const discountValue = computed(() => {
  const base = subtotal();
  if (discountKind() === "percent") {
    return Math.round(base * (discountRate() / 100) * 100) / 100;
  }
  return Math.round(Math.min(base, discountFixed()) * 100) / 100;
});

/** The applied discount as a share of the subtotal, for receipts and reports. */
export const discountPercent = computed(() => {
  const base = subtotal();
  return base > 0 ? Math.round((discountValue() / base) * 1000) / 10 : 0;
});

export const tax = computed(() =>
  Math.round((subtotal() - discountValue()) * taxRate * 100) / 100,
);

/** Tips in dollars, added after tax and discount. */
export const tip = signal(0);

/** What a percentage tip is calculated on. */
export const tipBase = computed(
  () => Math.round((subtotal() - discountValue()) * 100) / 100,
);

export const total = computed(
  () => Math.round((subtotal() + tax() - discountValue() + tip()) * 100) / 100,
);

/** Adds a unit; the same product with the same options merges into one line. */
export function addToCart(productId: string, modifiers: CartModifier[] = []): void {
  const product = byId(productId);
  if (!product) return;
  const signature = signatureOf(productId, modifiers);
  cart.update((lines) => {
    const found = lines.find((line) => line.signature === signature);
    if (found) {
      return lines.map((line) =>
        line.id === found.id ? { ...line, qty: line.qty + 1 } : line,
      );
    }
    return [...lines, lineOf(productId, 1, modifiers)];
  });
}

export function setQty(lineId: string, qty: number): void {
  cart.update((lines) =>
    qty <= 0
      ? lines.filter((line) => line.id !== lineId)
      : lines.map((line) => (line.id === lineId ? { ...line, qty } : line)),
  );
}

export function removeLine(lineId: string): void {
  cart.update((lines) => lines.filter((line) => line.id !== lineId));
}

/** Replaces a line's options and reprices it, keeping its quantity. */
export function updateLine(lineId: string, modifiers: CartModifier[]): void {
  const product = cart().find((line) => line.id === lineId);
  const source = product ? byId(product.productId) : undefined;
  if (!product || !source) return;
  cart.update((lines) =>
    lines.map((line) =>
      line.id === lineId
        ? {
            ...line,
            modifiers,
            price: priceWith(source, modifiers),
            signature: signatureOf(source.id, modifiers),
          }
        : line,
    ),
  );
}

export function resetDiscount(): void {
  discountKind.set("percent");
  discountRate.set(0);
  discountFixed.set(0);
  discountLabel.set("Discount");
}

export function clearCart(): void {
  cart.set([]);
  resetDiscount();
  tip.set(0);
  orderNote.set("");
  activeCustomer.set(null);
}

export interface HeldOrder {
  id: string;
  label: string;
  channel: Channel;
  table: string;
  guests: number;
  customer: Customer | null;
  lines: CartLine[];
  discountKind: DiscountKind;
  discountRate: number;
  discountFixed: number;
  discountLabel: string;
  note: string;
  total: number;
  heldAt: string;
}

/** Tickets parked at the counter, kept for this session. */
export const heldOrders = signal<HeldOrder[]>([]);
let heldSeq = 1049;

/** Parks the open ticket and starts a fresh one. */
export function holdCurrentOrder(): boolean {
  if (cart().length === 0) return false;
  heldSeq += 1;
  const entry: HeldOrder = {
    id: "held_" + heldSeq,
    label: "Order #" + heldSeq,
    channel: channel(),
    table: tableLabel(),
    guests: guests(),
    customer: activeCustomer(),
    lines: cart(),
    discountKind: discountKind(),
    discountRate: discountRate(),
    discountFixed: discountFixed(),
    discountLabel: discountLabel(),
    note: orderNote(),
    total: total(),
    heldAt: stamp(),
  };
  heldOrders.update((list) => [entry, ...list]);
  cart.set([]);
  activeCustomer.set(null);
  orderNote.set("");
  resetDiscount();
  return true;
}

export function resumeHeld(id: string): void {
  const entry = heldOrders().find((order) => order.id === id);
  if (!entry) return;
  cart.set(entry.lines);
  channel.set(entry.channel);
  tableLabel.set(entry.table);
  guests.set(entry.guests);
  activeCustomer.set(entry.customer);
  discountKind.set(entry.discountKind);
  discountRate.set(entry.discountRate);
  discountFixed.set(entry.discountFixed);
  discountLabel.set(entry.discountLabel);
  orderNote.set(entry.note);
  heldOrders.update((list) => list.filter((order) => order.id !== id));
}

/**
 * Moves the chosen lines onto their own held ticket, so the rest can be
 * settled separately. Refuses to move the whole ticket.
 */
export function splitOff(lineIds: string[]): number {
  const moving = cart().filter((line) => lineIds.includes(line.id));
  if (moving.length === 0 || moving.length === cart().length) return 0;
  heldSeq += 1;
  const subtotalMoving =
    Math.round(moving.reduce((sum, line) => sum + line.price * line.qty, 0) * 100) / 100;
  const entry: HeldOrder = {
    id: "held_" + heldSeq,
    label: "Order #" + heldSeq,
    channel: channel(),
    table: tableLabel(),
    guests: guests(),
    customer: null,
    lines: moving,
    discountKind: "percent",
    discountRate: 0,
    discountFixed: 0,
    discountLabel: "Discount",
    note: "Split from the open ticket",
    total: Math.round(subtotalMoving * (1 + taxRate) * 100) / 100,
    heldAt: stamp(),
  };
  heldOrders.update((list) => [entry, ...list]);
  cart.update((lines) => lines.filter((line) => !lineIds.includes(line.id)));
  return moving.length;
}

export function discardHeld(id: string): void {
  heldOrders.update((list) => list.filter((order) => order.id !== id));
}

/** How many of a product are in the cart (for the tile's counter). */
export function qtyOf(productId: string): number {
  return cart()
    .filter((line) => line.productId === productId)
    .reduce((sum, line) => sum + line.qty, 0);
}

/** The kitchen queue: order status changes in place while the app runs. */
export const kitchen = signal([
  { id: "1049", table: "Table 4", channel: "Dine-in", placed: "9:12 AM", status: "New" as OrderStatus, items: ["2× Café Latte (oat)", "1× Butter Croissant"], total: 12.2 },
  { id: "1048", table: "Counter", channel: "Takeaway", placed: "9:08 AM", status: "Preparing" as OrderStatus, items: ["1× Iced Mocha (less ice)", "1× Blueberry Muffin"], total: 8.9 },
  { id: "1047", table: "Table 2", channel: "Dine-in", placed: "9:01 AM", status: "Ready" as OrderStatus, items: ["2× Chicken Panini", "2× Cold Brew"], total: 27.0 },
  { id: "1046", table: "Table 6", channel: "Dine-in", placed: "8:54 AM", status: "Completed" as OrderStatus, items: ["1× NY Cheesecake", "1× Cappuccino"], total: 9.2 },
]);

export function advanceOrder(id: string): void {
  const next: Record<OrderStatus, OrderStatus> = {
    New: "Preparing",
    Preparing: "Ready",
    Ready: "Completed",
    Completed: "Completed",
  };
  const row = kitchen().find((entry) => entry.id === id);
  kitchen.update((rows) =>
    rows.map((entry) => (entry.id === id ? { ...entry, status: next[entry.status] } : entry)),
  );
  if (row) {
    void markOrder({
      id: row.id,
      orderNo: "#" + row.id,
      status: next[row.status],
      channel: row.channel,
      table: row.table,
      totalCents: Math.round(row.total * 100),
    }).catch((error) => {
      console.log("order status not written to sqlite: " + (error?.message ?? error));
    });
  }
}

export type PaymentMethod = "Card" | "Cash" | "QR / Wallet" | "Split" | "Credit";

export interface InvoiceSnapshot {
  number: string;
  issued: string;
  cashier: string;
  customer: string;
  customerNtn: string;
  channel: Channel;
  table: string;
  method: PaymentMethod;
  lines: { productId: string; name: string; qty: number; price: number; note: string }[];
  subtotal: number;
  discount: number;
  tax: number;
  tip: number;
  total: number;
  tendered: number;
  change: number;
  payments: { method: string; amount: number }[];
}

/** The receipt shown on the A4 invoice screen. */
export const lastInvoice = signal<InvoiceSnapshot>({
  number: "INV-GUL-T01-0134",
  issued: "25 Nov 2026 · 9:12 AM",
  cashier: "Sara Ahmed",
  customer: "Ayesha Khan",
  customerNtn: "NTN-4829104-2",
  channel: "Dine-in",
  table: "Table 4",
  method: "Card",
  lines: [
    { productId: "p-01", name: "Café Latte", qty: 2, price: 4.5, note: "Oat milk" },
    { productId: "p-05", name: "Iced Mocha", qty: 1, price: 5.4, note: "" },
    { productId: "p-07", name: "Butter Croissant", qty: 1, price: 3.2, note: "" },
  ],
  subtotal: 17.6,
  discount: 1.76,
  tax: 1.27,
  tip: 0,
  total: 17.11,
  tendered: 20,
  change: 2.89,
  payments: [],
});

/** Refunds and voids applied in this session, by invoice number. */
export const saleStatusOverride = signal<Record<string, SaleRecord["status"]>>({});

export function markSaleStatus(invoice: string, status: SaleRecord["status"]): void {
  saleStatusOverride.update((map) => ({ ...map, [invoice]: status }));
}

/** Removes a ticket from the board and records the void. */
export function voidKitchenOrder(id: string): void {
  const row = kitchen().find((entry) => entry.id === id);
  kitchen.update((rows) => rows.filter((entry) => entry.id !== id));
  if (row) {
    void markOrder({
      id: row.id,
      orderNo: "#" + row.id,
      status: "Voided",
      channel: row.channel,
      table: row.table,
      totalCents: Math.round(row.total * 100),
    }).catch((error) => {
      console.log("void not written to sqlite: " + (error?.message ?? error));
    });
  }
}

/** The PIN a manager enters to approve refunds and voids. */
export const managerPin = signal("2468");

export async function hydrateManagerPin(): Promise<void> {
  try {
    const pin = await getConfig("manager_pin");
    if (pin && /^\d{4}$/.test(pin)) managerPin.set(pin);
  } catch {
    // The demo PIN stays when the database is unavailable.
  }
}

export function saveManagerPin(pin: string): void {
  managerPin.set(pin);
  void setConfig("manager_pin", pin).catch((error) => {
    console.log("manager pin not written to sqlite: " + (error?.message ?? error));
  });
}

/** Stock counts, costs and par levels, shared by every inventory screen. */
export const inventory = signal<StockItem[]>(stockItems);

export function stockStatus(onHand: number, par: number): StockStatus {
  if (onHand <= 0) return "Out";
  if (onHand < par * 0.4) return "Critical";
  if (onHand < par) return "Low";
  return "OK";
}

export async function hydrateInventory(): Promise<void> {
  try {
    const rows = await loadInventory();
    if (rows.length === 0) return;
    inventory.set(
      rows.map((row) => {
        const onHand = Number(row.qty_on_hand);
        const par = Number(row.reorder_level);
        return {
          sku: row.sku,
          name: row.name,
          category: row.category,
          unit: row.unit,
          onHand,
          par,
          unitCost: Number(row.cost_cents) / 100,
          supplier:
            stockItems.find((item) => item.sku === row.sku)?.supplier ?? "—",
          status: stockStatus(onHand, par),
        };
      }),
    );
  } catch {
    // The mock stock list stays usable without the database.
  }
}

export function updateStockItem(sku: string, patch: Partial<StockItem>): void {
  inventory.update((list) =>
    list.map((item) => {
      if (item.sku !== sku) return item;
      const next = { ...item, ...patch };
      return { ...next, status: stockStatus(next.onHand, next.par) };
    }),
  );
}

/** Applies a signed quantity change in memory, before the database answers. */
export function applyStockDelta(sku: string, delta: number): void {
  const item = inventory().find((entry) => entry.sku === sku);
  if (!item) return;
  const onHand = Math.max(0, Math.round((item.onHand + delta) * 100) / 100);
  updateStockItem(sku, { onHand });
}

/** Adjustments posted in this session, newest first. */
export const recentAdjustments = signal<Adjustment[]>([]);

/** The SKU the next adjustment screen should start on. */
export const adjustTarget = signal<string | null>(null);

export function recordAdjustment(adjustment: Adjustment): void {
  recentAdjustments.update((list) => [adjustment, ...list]);
}

/** Goods receipts posted in this session, newest first. */
export const recentGrns = signal<Grn[]>([]);

/** The GRN each purchase order was received against in this session. */
export const receivedPurchaseOrders = signal<Record<string, string>>({});

/** Supplier bills and journal entries posted with a receipt, newest first. */
export const recentBills = signal<VendorBillRow[]>([]);
export const recentJournal = signal<JournalRow[]>([]);
export const recentExpenses = signal<ExpenseRow[]>([]);

/** Lists a newly coded expense and its ledger entry. */
export function recordExpensePosted(row: ExpenseRow, entry: JournalRow): void {
  recentExpenses.update((list) => [row, ...list]);
  recentJournal.update((list) => [entry, ...list]);
}

/** Lists a manual journal entry alongside the auto-posted ones. */
export function recordJournalEntry(entry: JournalRow): void {
  recentJournal.update((list) => [entry, ...list]);
}

/** Drafts posted in this session, so the list can flip them without a reload. */
export const postedDrafts = signal<Record<string, boolean>>({});

export function markJournalPosted(ref: string): void {
  postedDrafts.update((map) => ({ ...map, [ref]: true }));
  recentJournal.update((list) =>
    list.map((entry) => (entry.ref === ref ? { ...entry, status: "Posted" } : entry)),
  );
}

/** Bills paid in this session, by bill number. */
export const paidBills = signal<Record<string, { entryNo: string; amountCents: number }>>({});

/** Marks a bill paid in memory and lists the AP → bank entry in the journal. */
export function recordBillPayment(
  billNo: string,
  vendor: string,
  amountCents: number,
  entryNo: string,
): void {
  paidBills.update((map) => ({ ...map, [billNo]: { entryNo, amountCents } }));
  recentJournal.update((list) => [
    {
      ref: entryNo,
      description: "Paid " + billNo + " · " + vendor,
      posted_at: new Date().toISOString(),
      debit: "2000 Accounts payable",
      credit: "1010 Bank · Meezan current",
      amount_cents: amountCents,
      status: "Posted",
    },
    ...list,
  ]);
}

/** Lists a posted receipt in GRN history and refreshes its purchase order row. */
export function recordGoodsReceipt(
  grn: Grn,
  poNo: string,
  bill: VendorBillRow,
  entry: JournalRow,
): void {
  recentGrns.update((list) => [grn, ...list]);
  recentBills.update((list) => [bill, ...list]);
  recentJournal.update((list) => [entry, ...list]);
  receivedPurchaseOrders.update((map) => ({ ...map, [poNo]: grn.number }));
}

/** The floor plan, with each table's open ticket. */
export const diningTables = signal<DiningTable[]>(initialTables);

export function seatTable(id: string): DiningTable | null {
  const table = diningTables().find((entry) => entry.id === id);
  if (!table) return null;
  diningTables.update((list) =>
    list.map((entry) =>
      entry.id === id
        ? {
            ...entry,
            status: "Seated",
            orderNo: "#" + (1051 + list.filter((row) => row.status !== "Free").length),
            amount: 0,
            openedAt: stamp().split(" · ")[1] ?? "Just now",
            server: cashier.name,
          }
        : entry,
    ),
  );
  tableLabel.set(table.label);
  guests.set(table.seats);
  channel.set("Dine-in");
  return table;
}

export function requestBill(id: string): void {
  diningTables.update((list) =>
    list.map((entry) => (entry.id === id ? { ...entry, status: "Needs bill" } : entry)),
  );
}

export function clearTable(id: string): void {
  diningTables.update((list) =>
    list.map((entry) =>
      entry.id === id
        ? { id: entry.id, label: entry.label, section: entry.section, seats: entry.seats, status: "Free" }
        : entry,
    ),
  );
}

/** Sales rung up while the app runs, newest first. */
export const recentSales = signal<SaleRecord[]>([]);

/** Closes the open order into an invoice, then empties the register. */
export function completeSale(
  method: PaymentMethod,
  tendered: number,
  payments: { method: string; amount: number }[] = [],
): InvoiceSnapshot {
  const member = activeCustomer();
  const snapshot: InvoiceSnapshot = {
    number: allocateInvoiceNo(),
    issued: stamp(),
    cashier: cashier.name,
    customer: member?.name ?? "Walk-in",
    customerNtn: member ? "NTN-4829104-2" : "",
    channel: channel(),
    table: tableLabel(),
    method,
    lines: cart().map((line) => ({
      productId: line.productId,
      name: line.name,
      qty: line.qty,
      price: line.price,
      note: line.modifiers.length
        ? line.modifiers.map((modifier) => modifier.name).join(" · ")
        : line.note,
    })),
    subtotal: subtotal(),
    discount: discountValue(),
    tax: tax(),
    tip: tip(),
    total: total(),
    tendered: method === "Cash" ? tendered : total(),
    change: method === "Cash" ? Math.max(0, tendered - total()) : 0,
    payments,
  };
  lastInvoice.set(snapshot);

  recentSales.update((rows) => [
    {
      id: snapshot.number,
      invoice: snapshot.number,
      date: shortDate(snapshot.issued),
      time: shortTime(snapshot.issued),
      customer: snapshot.customer,
      channel: snapshot.channel,
      method: method === "QR / Wallet" ? "Wallet" : method === "Card" ? "Card" : "Cash",
      cashier: cashier.name,
      items: snapshot.lines.reduce((sum, line) => sum + line.qty, 0),
      subtotal: snapshot.subtotal - snapshot.discount,
      tax: snapshot.tax,
      total: snapshot.total,
      status: "Paid",
    },
    ...rows,
  ]);

  cart.set([]);
  resetDiscount();
  tip.set(0);
  orderNote.set("");
  activeCustomer.set(null);

  // The UI already shows the committed local state; the SQLite write and its
  // outbox rows follow asynchronously and update the sync counters.
  void writeSale({
    invoiceNo: snapshot.number,
    customerName: snapshot.customer,
    customerNtn: "NTN-4829104-2",
    channel: snapshot.channel,
    table: snapshot.table,
    method: snapshot.method,
    lines: snapshot.lines.map((line) => ({
      productId: line.productId,
      name: line.name,
      qty: line.qty,
      priceCents: Math.round(line.price * 100),
      note: line.note,
    })),
    subtotalCents: Math.round(snapshot.subtotal * 100),
    discountCents: Math.round(snapshot.discount * 100),
    taxCents: Math.round(snapshot.tax * 100),
    totalCents: Math.round(snapshot.total * 100),
    tipCents: Math.round(snapshot.tip * 100),
    tenderedCents: Math.round(snapshot.tendered * 100),
    changeCents: Math.round(snapshot.change * 100),
    promoCode: snapshot.discount > 0 ? discountLabel() : null,
    customerId: member?.id ?? null,
    issuedAt: new Date().toISOString(),
  }).catch((error) => {
    console.log("sale not written to sqlite: " + (error?.message ?? error));
  });

  return snapshot;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** `25 Nov 2026 · 9:18 AM` */
export function stamp(at: Date = new Date()): string {
  const h24 = at.getHours();
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return (
    at.getDate() +
    " " +
    MONTHS[at.getMonth()] +
    " " +
    at.getFullYear() +
    " · " +
    h12 +
    ":" +
    String(at.getMinutes()).padStart(2, "0") +
    " " +
    (h24 < 12 ? "AM" : "PM")
  );
}

function shortDate(stampText: string): string {
  const parts = stampText.split(" ");
  return (parts[1] ?? "Nov") + " " + (parts[0] ?? "25");
}

function shortTime(stampText: string): string {
  return stampText.split(" · ")[1] ?? "9:18 AM";
}

/** Loads committed sales from SQLite into the sales list, newest first. */
export async function hydrateSales(): Promise<void> {
  try {
    const rows = await recentSaleRows(30);
    if (rows.length === 0) return;
    const mine: SaleRecord[] = rows.map((row) => ({
      id: row.invoice_no,
      invoice: row.invoice_no,
      date: shortDate(stamp(new Date(row.issued_at))),
      time: shortTime(stamp(new Date(row.issued_at))),
      customer: row.customer_name,
      channel: (row.channel as SaleRecord["channel"]) ?? "Dine-in",
      method: row.payment_method === "Wallet" ? "Wallet" : row.payment_method === "Card" ? "Card" : "Cash",
      cashier: cashier.name,
      items: Number(row.items ?? 0),
      subtotal: Number(row.subtotal_cents) / 100,
      tax: Number(row.gst_cents) / 100,
      total: Number(row.grand_total_cents) / 100,
      status: (row.status as SaleRecord["status"]) ?? "Paid",
    }));

    recentSales.update((current) => {
      const seen = new Set(current.map((sale) => sale.invoice));
      const extra = mine.filter((sale) => !seen.has(sale.invoice));
      return [...extra, ...current];
    });
  } catch {
    // The in-memory list stays usable without the database.
  }
}

