/** Inventory, purchasing and accounting fixtures for the desktop screens. */

export type StockStatus = "OK" | "Low" | "Critical" | "Out";

export interface StockItem {
  sku: string;
  name: string;
  category: string;
  unit: string;
  onHand: number;
  par: number;
  unitCost: number;
  supplier: string;
  status: StockStatus;
}

export const stockItems: StockItem[] = [
  { sku: "BEV-001", name: "Espresso beans · House blend", category: "Coffee", unit: "kg", onHand: 18.4, par: 12, unitCost: 24.5, supplier: "Café Imports", status: "OK" },
  { sku: "BEV-002", name: "Espresso beans · Single origin", category: "Coffee", unit: "kg", onHand: 4.2, par: 8, unitCost: 31.0, supplier: "Café Imports", status: "Low" },
  { sku: "DAI-010", name: "Whole milk", category: "Dairy", unit: "L", onHand: 42, par: 30, unitCost: 1.35, supplier: "Nestlé Dairy", status: "OK" },
  { sku: "DAI-011", name: "Oat milk · barista", category: "Dairy", unit: "L", onHand: 6, par: 18, unitCost: 2.8, supplier: "Nestlé Dairy", status: "Critical" },
  { sku: "DAI-012", name: "Heavy cream", category: "Dairy", unit: "L", onHand: 9.5, par: 8, unitCost: 3.4, supplier: "Nestlé Dairy", status: "OK" },
  { sku: "BAK-020", name: "Butter croissant dough", category: "Bakery", unit: "kg", onHand: 0, par: 6, unitCost: 7.2, supplier: "Golden Crumb", status: "Out" },
  { sku: "BAK-021", name: "Almond paste", category: "Bakery", unit: "kg", onHand: 3.1, par: 4, unitCost: 12.6, supplier: "Golden Crumb", status: "Low" },
  { sku: "BAK-022", name: "Cheesecake base", category: "Bakery", unit: "pcs", onHand: 14, par: 10, unitCost: 4.1, supplier: "Golden Crumb", status: "OK" },
  { sku: "SYR-030", name: "Vanilla syrup", category: "Syrups", unit: "btl", onHand: 7, par: 6, unitCost: 8.9, supplier: "Bar Essentials", status: "OK" },
  { sku: "SYR-031", name: "Dark chocolate sauce", category: "Syrups", unit: "btl", onHand: 2, par: 5, unitCost: 9.4, supplier: "Bar Essentials", status: "Low" },
  { sku: "PAP-040", name: "12 oz hot cups", category: "Packaging", unit: "pack", onHand: 22, par: 15, unitCost: 6.5, supplier: "EcoPack", status: "OK" },
  { sku: "PAP-041", name: "16 oz cold cups", category: "Packaging", unit: "pack", onHand: 4, par: 12, unitCost: 7.1, supplier: "EcoPack", status: "Critical" },
  { sku: "FOD-050", name: "Sourdough loaf", category: "Food", unit: "pcs", onHand: 11, par: 10, unitCost: 3.9, supplier: "Golden Crumb", status: "OK" },
  { sku: "FOD-051", name: "Chicken breast", category: "Food", unit: "kg", onHand: 5.8, par: 4, unitCost: 11.2, supplier: "Freshline", status: "OK" },
];

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  leadDays: number;
  rating: number;
  lastDelivery: string;
  payable: number;
  audit: "Verified" | "Due" | "Overdue";
  items: number;
}

export const suppliers: Supplier[] = [
  { id: "sup-1", name: "Café Imports", contact: "Imran Sheikh", phone: "+92 300 2211334", leadDays: 3, rating: 4.8, lastDelivery: "Nov 22", payable: 1840.0, audit: "Verified", items: 8 },
  { id: "sup-2", name: "Nestlé Dairy", contact: "Adeel Raza", phone: "+92 321 7788990", leadDays: 1, rating: 4.6, lastDelivery: "Today", payable: 620.5, audit: "Due", items: 6 },
  { id: "sup-3", name: "Golden Crumb", contact: "Nida Aslam", phone: "+92 333 4455661", leadDays: 2, rating: 4.9, lastDelivery: "Nov 23", payable: 0, audit: "Verified", items: 12 },
  { id: "sup-4", name: "Bar Essentials", contact: "Kamran Ali", phone: "+92 345 1122345", leadDays: 5, rating: 4.1, lastDelivery: "Nov 15", payable: 2140.0, audit: "Overdue", items: 9 },
  { id: "sup-5", name: "EcoPack", contact: "Sadaf Iqbal", phone: "+92 302 6677889", leadDays: 4, rating: 4.4, lastDelivery: "Nov 18", payable: 980.0, audit: "Verified", items: 5 },
];

export type GrnStatus = "Posted" | "Draft" | "Disputed";

export interface Grn {
  number: string;
  supplier: string;
  po: string;
  received: string;
  lines: number;
  total: number;
  invoice: string;
  status: GrnStatus;
}

export const grns: Grn[] = [
  { number: "GRN-2026-0118", supplier: "Nestlé Dairy", po: "PO-2026-0142", received: "Today · 7:40 AM", lines: 4, total: 418.6, invoice: "INV-88213", status: "Posted" },
  { number: "GRN-2026-0117", supplier: "Golden Crumb", po: "PO-2026-0140", received: "Yesterday · 6:15 AM", lines: 6, total: 322.4, invoice: "INV-11902", status: "Posted" },
  { number: "GRN-2026-0116", supplier: "Café Imports", po: "PO-2026-0139", received: "Nov 22 · 11:05 AM", lines: 2, total: 735.0, invoice: "INV-77410", status: "Disputed" },
  { number: "GRN-2026-0115", supplier: "EcoPack", po: "PO-2026-0137", received: "Nov 18 · 9:20 AM", lines: 3, total: 214.5, invoice: "INV-44120", status: "Posted" },
  { number: "GRN-2026-0114", supplier: "Bar Essentials", po: "PO-2026-0135", received: "Nov 15 · 2:45 PM", lines: 5, total: 540.0, invoice: "INV-22871", status: "Posted" },
];

export type PoStatus = "Draft" | "Sent" | "Partial" | "Received";

/** A purchase order line, priced in cents like every other document. */
export interface PoLine {
  sku: string;
  name: string;
  qty: number;
  costCents: number;
}

export interface PurchaseOrder {
  number: string;
  supplier: string;
  created: string;
  expected: string;
  lines: number;
  total: number;
  status: PoStatus;
  detail: PoLine[];
}

export const purchaseOrders: PurchaseOrder[] = [
  {
    number: "PO-2026-0145",
    supplier: "EcoPack",
    created: "Today",
    expected: "Nov 28",
    lines: 2,
    total: 326.4,
    status: "Sent",
    detail: [
      { sku: "PAP-040", name: "12 oz hot cups", qty: 24, costCents: 650 },
      { sku: "PAP-041", name: "16 oz cold cups", qty: 24, costCents: 710 },
    ],
  },
  {
    number: "PO-2026-0144",
    supplier: "Bar Essentials",
    created: "Today",
    expected: "Nov 30",
    lines: 2,
    total: 332.4,
    status: "Draft",
    detail: [
      { sku: "SYR-030", name: "Vanilla syrup", qty: 12, costCents: 890 },
      { sku: "SYR-031", name: "Dark chocolate sauce", qty: 24, costCents: 940 },
    ],
  },
  {
    number: "PO-2026-0142",
    supplier: "Nestlé Dairy",
    created: "Nov 23",
    expected: "Today",
    lines: 3,
    total: 412.8,
    status: "Received",
    detail: [
      { sku: "DAI-010", name: "Whole milk", qty: 96, costCents: 135 },
      { sku: "DAI-011", name: "Oat milk · barista", qty: 72, costCents: 280 },
      { sku: "DAI-012", name: "Heavy cream", qty: 24, costCents: 340 },
    ],
  },
  {
    number: "PO-2026-0140",
    supplier: "Golden Crumb",
    created: "Nov 22",
    expected: "Yesterday",
    lines: 4,
    total: 331.2,
    status: "Received",
    detail: [
      { sku: "BAK-020", name: "Butter croissant dough", qty: 20, costCents: 720 },
      { sku: "BAK-021", name: "Almond paste", qty: 6, costCents: 1260 },
      { sku: "BAK-022", name: "Cheesecake base", qty: 12, costCents: 410 },
      { sku: "FOD-050", name: "Sourdough loaf", qty: 16, costCents: 390 },
    ],
  },
  {
    number: "PO-2026-0139",
    supplier: "Café Imports",
    created: "Nov 20",
    expected: "Nov 23",
    lines: 2,
    total: 738.0,
    status: "Partial",
    detail: [
      { sku: "BEV-001", name: "Espresso beans · House blend", qty: 20, costCents: 2450 },
      { sku: "BEV-002", name: "Espresso beans · Single origin", qty: 8, costCents: 3100 },
    ],
  },
];

export interface Adjustment {
  number: string;
  items: number;
  reason: "Waste" | "Spillage" | "Expiry" | "Count correction";
  value: number;
  by: string;
  date: string;
  status: "Posted" | "Draft";
}

export const adjustments: Adjustment[] = [
  { number: "ADJ-2026-0061", items: 2, reason: "Waste", value: -42.8, by: "Sara Ahmed", date: "Today · 8:20 AM", status: "Posted" },
  { number: "ADJ-2026-0060", items: 1, reason: "Expiry", value: -18.4, by: "Usman Tariq", date: "Yesterday · 7:05 PM", status: "Posted" },
  { number: "ADJ-2026-0059", items: 4, reason: "Count correction", value: 26.1, by: "Sara Ahmed", date: "Nov 23 · 9:10 AM", status: "Posted" },
  { number: "ADJ-2026-0058", items: 2, reason: "Spillage", value: -9.6, by: "Adeel Raza", date: "Nov 22 · 4:40 PM", status: "Draft" },
];

export interface Transfer {
  number: string;
  from: string;
  to: string;
  items: number;
  value: number;
  sent: string;
  status: "In transit" | "Received" | "Draft";
}

export const transfers: Transfer[] = [
  { number: "TRF-2026-0032", from: "Gulberg Café", to: "DHA Phase 5", items: 3, value: 184.2, sent: "Today · 7:00 AM", status: "In transit" },
  { number: "TRF-2026-0031", from: "Gulberg Café", to: "Johar Town", items: 5, value: 312.8, sent: "Yesterday · 6:30 PM", status: "Received" },
  { number: "TRF-2026-0030", from: "DHA Phase 5", to: "Gulberg Café", items: 2, value: 96.0, sent: "Nov 22 · 10:15 AM", status: "Received" },
];

export interface Recipe {
  product: string;
  category: string;
  components: { name: string; qty: string; cost: number }[];
  price: number;
  cost: number;
  margin: number;
}

export const recipes: Recipe[] = [
  { product: "Café Latte", category: "Coffee", price: 4.5, cost: 1.24, margin: 72.4, components: [ { name: "Espresso beans", qty: "18 g", cost: 0.44 }, { name: "Whole milk", qty: "180 ml", cost: 0.24 }, { name: "12 oz cup + lid", qty: "1", cost: 0.31 }, { name: "Labour allocation", qty: "1 min", cost: 0.25 } ] },
  { product: "Cappuccino", category: "Coffee", price: 4.2, cost: 1.08, margin: 74.3, components: [ { name: "Espresso beans", qty: "18 g", cost: 0.44 }, { name: "Whole milk", qty: "120 ml", cost: 0.16 }, { name: "8 oz cup + lid", qty: "1", cost: 0.28 }, { name: "Labour allocation", qty: "1 min", cost: 0.20 } ] },
  { product: "Iced Mocha", category: "Cold drinks", price: 5.4, cost: 1.72, margin: 68.1, components: [ { name: "Espresso beans", qty: "18 g", cost: 0.44 }, { name: "Dark chocolate sauce", qty: "30 ml", cost: 0.38 }, { name: "Whole milk", qty: "150 ml", cost: 0.20 }, { name: "16 oz cup + lid", qty: "1", cost: 0.35 }, { name: "Ice + labour", qty: "—", cost: 0.35 } ] },
  { product: "Butter Croissant", category: "Bakery", price: 3.2, cost: 1.36, margin: 57.5, components: [ { name: "Croissant dough", qty: "95 g", cost: 0.68 }, { name: "Bake + wrap", qty: "—", cost: 0.42 }, { name: "Paper bag", qty: "1", cost: 0.26 } ] },
  { product: "Chicken Panini", category: "Sandwiches", price: 8.9, cost: 3.42, margin: 61.6, components: [ { name: "Sourdough loaf", qty: "1/4", cost: 0.98 }, { name: "Chicken breast", qty: "110 g", cost: 1.23 }, { name: "Cheese + sauce", qty: "—", cost: 0.71 }, { name: "Packaging + labour", qty: "—", cost: 0.50 } ] },
];

/* ——— Accounting ——— */

export type AccountType = "Asset" | "Liability" | "Equity" | "Revenue" | "Expense";

export interface Account {
  code: string;
  name: string;
  type: AccountType;
  balance: number;
}

export const accounts: Account[] = [
  { code: "1000", name: "Cash on hand", type: "Asset", balance: 4820.5 },
  { code: "1010", name: "Bank · Meezan current", type: "Asset", balance: 28410.75 },
  { code: "1020", name: "Card settlements receivable", type: "Asset", balance: 3260.2 },
  { code: "1200", name: "Inventory", type: "Asset", balance: 18420.6 },
  { code: "1500", name: "Equipment", type: "Asset", balance: 42500.0 },
  { code: "2000", name: "Accounts payable", type: "Liability", balance: 5580.5 },
  { code: "2100", name: "Sales tax payable", type: "Liability", balance: 2140.3 },
  { code: "2200", name: "Payroll payable", type: "Liability", balance: 8900.0 },
  { code: "3000", name: "Owner's equity", type: "Equity", balance: 50000.0 },
  { code: "4000", name: "Sales · food & beverage", type: "Revenue", balance: 86420.4 },
  { code: "4100", name: "Sales · merchandise", type: "Revenue", balance: 6240.0 },
  { code: "5000", name: "Cost of goods sold", type: "Expense", balance: 24890.2 },
  { code: "5100", name: "Rent", type: "Expense", balance: 12000.0 },
  { code: "5200", name: "Salaries & wages", type: "Expense", balance: 18400.0 },
  { code: "5300", name: "Utilities", type: "Expense", balance: 3260.8 },
  { code: "5400", name: "Waste & spoilage", type: "Expense", balance: 742.6 },
];

export interface JournalEntry {
  date: string;
  ref: string;
  description: string;
  debit: string;
  credit: string;
  amount: number;
  status: "Posted" | "Draft";
}

export const journal: JournalEntry[] = [
  { date: "Nov 25", ref: "JE-2026-0418", description: "Daily sales · card settlements", debit: "1020 Card settlements", credit: "4000 Sales", amount: 2410.3, status: "Posted" },
  { date: "Nov 25", ref: "JE-2026-0417", description: "Daily sales · cash", debit: "1000 Cash on hand", credit: "4000 Sales", amount: 1840.2, status: "Posted" },
  { date: "Nov 25", ref: "JE-2026-0416", description: "Sales tax collected", debit: "4000 Sales", credit: "2100 Sales tax payable", amount: 340.1, status: "Posted" },
  { date: "Nov 24", ref: "JE-2026-0415", description: "Milk delivery · Nestlé Dairy", debit: "1200 Inventory", credit: "2000 Accounts payable", amount: 418.6, status: "Posted" },
  { date: "Nov 24", ref: "JE-2026-0414", description: "Waste write-off · bakery", debit: "5400 Waste & spoilage", credit: "1200 Inventory", amount: 42.8, status: "Posted" },
  { date: "Nov 23", ref: "JE-2026-0413", description: "Card settlement received", debit: "1010 Bank", credit: "1020 Card settlements", amount: 3260.2, status: "Draft", },
];

export interface Expense {
  date: string;
  vendor: string;
  category: string;
  account: string;
  amount: number;
  method: "Cash" | "Card" | "Bank";
  status: "Paid" | "Pending";
}

export const expenses: Expense[] = [
  { date: "Nov 25", vendor: "Nestlé Dairy", category: "Inventory", account: "1200", amount: 418.6, method: "Bank", status: "Paid" },
  { date: "Nov 24", vendor: "Lesco", category: "Utilities", account: "5300", amount: 612.4, method: "Bank", status: "Paid" },
  { date: "Nov 23", vendor: "Golden Crumb", category: "Inventory", account: "1200", amount: 322.4, method: "Bank", status: "Paid" },
  { date: "Nov 22", vendor: "Metro Cash & Carry", category: "Supplies", account: "5300", amount: 184.9, method: "Card", status: "Paid" },
  { date: "Nov 21", vendor: "EcoPack", category: "Packaging", account: "1200", amount: 214.5, method: "Cash", status: "Pending" },
  { date: "Nov 20", vendor: "Café Imports", category: "Inventory", account: "1200", amount: 735.0, method: "Bank", status: "Paid" },
];

export interface Payable {
  vendor: string;
  invoice: string;
  due: string;
  amount: number;
  bucket: "Current" | "1–30 days" | "31–60 days";
  status: "Scheduled" | "Due" | "Overdue";
}

export const payables: Payable[] = [
  { vendor: "Café Imports", invoice: "INV-77410", due: "Dec 2", amount: 735.0, bucket: "Current", status: "Scheduled" },
  { vendor: "Bar Essentials", invoice: "INV-22871", due: "Nov 20", amount: 540.0, bucket: "1–30 days", status: "Overdue" },
  { vendor: "EcoPack", invoice: "INV-44120", due: "Nov 27", amount: 214.5, bucket: "Current", status: "Due" },
  { vendor: "Nestlé Dairy", invoice: "INV-88213", due: "Nov 28", amount: 418.6, bucket: "Current", status: "Due" },
  { vendor: "Golden Crumb", invoice: "INV-11902", due: "Dec 5", amount: 322.4, bucket: "Current", status: "Scheduled" },
];

export interface BankLine {
  date: string;
  description: string;
  reference: string;
  amount: number;
  matched: boolean;
  suggestion: string;
}

export const bankLines: BankLine[] = [
  { date: "Nov 25", description: "Card settlement batch", reference: "MS-88213", amount: 2410.3, matched: true, suggestion: "JE-2026-0418" },
  { date: "Nov 25", description: "Lesco utility bill", reference: "LESCO-9921", amount: -612.4, matched: false, suggestion: "Expense · Utilities" },
  { date: "Nov 24", description: "Nestlé Dairy transfer", reference: "NEST-4186", amount: -418.6, matched: true, suggestion: "INV-88213" },
  { date: "Nov 23", description: "Cash deposit · safe drop", reference: "DEP-3391", amount: 1840.2, matched: false, suggestion: "Daily sales · cash" },
  { date: "Nov 22", description: "Café Imports transfer", reference: "CAFE-7350", amount: -735.0, matched: false, suggestion: "INV-77410" },
  { date: "Nov 21", description: "EcoPack card payment", reference: "ECO-2145", amount: -214.5, matched: true, suggestion: "INV-44120" },
];

export const pnl = {
  revenue: 92660.4,
  cogs: 24890.2,
  gross: 67770.2,
  expenses: 34403.4,
  net: 33366.8,
  taxCollected: 7412.8,
  taxPaid: 5271.9,
  lines: [
    { label: "Food & beverage sales", value: 86420.4, ratio: 0.93 },
    { label: "Merchandise", value: 6240.0, ratio: 0.07 },
    { label: "Cost of goods sold", value: 24890.2, ratio: 0.27 },
    { label: "Salaries & wages", value: 18400.0, ratio: 0.2 },
    { label: "Rent", value: 12000.0, ratio: 0.13 },
    { label: "Utilities", value: 3260.8, ratio: 0.04 },
    { label: "Waste & spoilage", value: 742.6, ratio: 0.01 },
  ],
};
