/** Mock data lifted from the Stitch reference screens, so the UI reads real. */

export type Category = "Coffee" | "Cold drinks" | "Bakery" | "Sandwiches";

export interface Product {
  id: string;
  name: string;
  category: Category;
  price: number;
  note: string;
  emoji: string;
  tint: string;
  badge?: string;
  soldToday: number;
}

export const products: Product[] = [
  { id: "p-01", name: "Café Latte", category: "Coffee", price: 4.5, note: "12 oz · Hot", emoji: "☕", tint: "#F7EDE9", badge: "Popular", soldToday: 42 },
  { id: "p-02", name: "Cappuccino", category: "Coffee", price: 4.2, note: "8 oz · Hot", emoji: "☕", tint: "#F5F3EE", soldToday: 31 },
  { id: "p-03", name: "Flat White", category: "Coffee", price: 4.8, note: "6 oz · Hot", emoji: "☕", tint: "#F7EDE9", soldToday: 28 },
  { id: "p-04", name: "Americano", category: "Coffee", price: 3.6, note: "12 oz · Hot", emoji: "☕", tint: "#F5F3EE", soldToday: 22 },
  { id: "p-05", name: "Iced Mocha", category: "Cold drinks", price: 5.4, note: "16 oz · Iced", emoji: "🥤", tint: "#EAF1F7", soldToday: 26 },
  { id: "p-06", name: "Cold Brew", category: "Cold drinks", price: 4.6, note: "16 oz · Iced", emoji: "🧊", tint: "#EAF1F7", soldToday: 19 },
  { id: "p-07", name: "Butter Croissant", category: "Bakery", price: 3.2, note: "Bakery", emoji: "🥐", tint: "#FBF3E0", soldToday: 12 },
  { id: "p-08", name: "Almond Croissant", category: "Bakery", price: 3.8, note: "Bakery", emoji: "🥐", tint: "#FBF3E0", badge: "Sold out", soldToday: 16 },
  { id: "p-09", name: "NY Cheesecake", category: "Bakery", price: 5.0, note: "Slice", emoji: "🍰", tint: "#F5ECF3", soldToday: 9 },
  { id: "p-10", name: "Blueberry Muffin", category: "Bakery", price: 3.5, note: "Bakery", emoji: "🧁", tint: "#F5ECF3", soldToday: 14 },
  { id: "p-11", name: "Chicken Panini", category: "Sandwiches", price: 8.9, note: "Grilled", emoji: "🥪", tint: "#EAF3E4", soldToday: 21 },
  { id: "p-12", name: "Avocado Toast", category: "Sandwiches", price: 9.5, note: "Sourdough", emoji: "🥑", tint: "#EAF3E4", soldToday: 18 },
];

export interface ModifierOption {
  id: string;
  name: string;
  price: number;
}

export interface ModifierGroup {
  id: string;
  name: string;
  /** A choice is required (single) or at least offered (multiple). */
  required: boolean;
  multiple: boolean;
  options: ModifierOption[];
}

const size = (extra: number): ModifierGroup => ({
  id: "size",
  name: "Size",
  required: true,
  multiple: false,
  options: [
    { id: "regular", name: "Regular 12 oz", price: 0 },
    { id: "large", name: "Large 16 oz", price: extra },
    { id: "small", name: "Small 8 oz", price: -0.4 },
  ],
});

const milk: ModifierGroup = {
  id: "milk",
  name: "Milk",
  required: true,
  multiple: false,
  options: [
    { id: "whole", name: "Whole milk", price: 0 },
    { id: "oat", name: "Oat milk", price: 0.5 },
    { id: "almond", name: "Almond milk", price: 0.5 },
    { id: "skim", name: "Skim milk", price: 0 },
  ],
};

const coffeeExtras: ModifierGroup = {
  id: "extras",
  name: "Extras",
  required: false,
  multiple: true,
  options: [
    { id: "shot", name: "Extra shot", price: 0.5 },
    { id: "vanilla", name: "Vanilla syrup", price: 0.4 },
    { id: "caramel", name: "Caramel syrup", price: 0.4 },
    { id: "decaf", name: "Decaf", price: 0 },
  ],
};

const coldExtras: ModifierGroup = {
  id: "extras",
  name: "Extras",
  required: false,
  multiple: true,
  options: [
    { id: "shot", name: "Extra shot", price: 0.5 },
    { id: "cream", name: "Whipped cream", price: 0.4 },
    { id: "less-ice", name: "Less ice", price: 0 },
    { id: "no-ice", name: "No ice", price: 0 },
  ],
};

/** Modifier groups by category; bakery items are added as they are. */
export const modifierGroups: Record<Category, ModifierGroup[]> = {
  Coffee: [size(0.6), milk, coffeeExtras],
  "Cold drinks": [size(0.7), milk, coldExtras],
  Bakery: [],
  Sandwiches: [
    {
      id: "addons",
      name: "Add-ons",
      required: false,
      multiple: true,
      options: [
        { id: "cheese", name: "Cheese", price: 0.8 },
        { id: "avocado", name: "Avocado", price: 1.5 },
        { id: "chicken", name: "Extra chicken", price: 2.0 },
      ],
    },
    {
      id: "side",
      name: "Side",
      required: true,
      multiple: false,
      options: [
        { id: "none", name: "No side", price: 0 },
        { id: "chips", name: "Chips", price: 1.2 },
        { id: "salad", name: "Side salad", price: 1.5 },
      ],
    },
  ],
};

export function groupsFor(product: Product): ModifierGroup[] {
  return modifierGroups[product.category] ?? [];
}

export const categories: { name: Category; count: number }[] = [
  { name: "Coffee", count: 14 },
  { name: "Cold drinks", count: 8 },
  { name: "Bakery", count: 10 },
  { name: "Sandwiches", count: 6 },
];

export type OrderStatus = "New" | "Preparing" | "Ready" | "Completed";

export interface OrderLine {
  productId: string;
  name: string;
  qty: number;
  price: number;
  note?: string;
}

export interface Order {
  id: string;
  number: string;
  table: string;
  guests: number;
  placedAt: string;
  status: OrderStatus;
  channel: "Dine-in" | "Takeaway" | "Delivery";
  items: OrderLine[];
  total: number;
}

export const orders: Order[] = [
  {
    id: "o-1049", number: "#1049", table: "Table 4", guests: 2, placedAt: "9:12 AM",
    status: "New", channel: "Dine-in",
    items: [
      { productId: "p-01", name: "Café Latte", qty: 2, price: 4.5, note: "Oat milk" },
      { productId: "p-07", name: "Butter Croissant", qty: 1, price: 3.2 },
    ],
    total: 12.2,
  },
  {
    id: "o-1048", number: "#1048", table: "Counter", guests: 1, placedAt: "9:08 AM",
    status: "Preparing", channel: "Takeaway",
    items: [
      { productId: "p-05", name: "Iced Mocha", qty: 1, price: 5.4, note: "Less ice" },
      { productId: "p-10", name: "Blueberry Muffin", qty: 1, price: 3.5 },
    ],
    total: 8.9,
  },
  {
    id: "o-1047", number: "#1047", table: "Table 2", guests: 3, placedAt: "9:01 AM",
    status: "Ready", channel: "Dine-in",
    items: [
      { productId: "p-11", name: "Chicken Panini", qty: 2, price: 8.9 },
      { productId: "p-06", name: "Cold Brew", qty: 2, price: 4.6 },
    ],
    total: 27.0,
  },
  {
    id: "o-1046", number: "#1046", table: "Table 6", guests: 2, placedAt: "8:54 AM",
    status: "Completed", channel: "Dine-in",
    items: [
      { productId: "p-09", name: "NY Cheesecake", qty: 1, price: 5.0 },
      { productId: "p-02", name: "Cappuccino", qty: 1, price: 4.2 },
    ],
    total: 9.2,
  },
  {
    id: "o-1045", number: "#1045", table: "Delivery", guests: 0, placedAt: "8:47 AM",
    status: "Completed", channel: "Delivery",
    items: [
      { productId: "p-12", name: "Avocado Toast", qty: 1, price: 9.5 },
      { productId: "p-03", name: "Flat White", qty: 1, price: 4.8 },
    ],
    total: 14.3,
  },
];

export interface Customer {
  id: string;
  name: string;
  initials: string;
  phone: string;
  address: string;
  tier: "Bronze" | "Silver" | "Gold";
  stamps: number;
  visits: number;
  spend: number;
  lastVisit: string;
  favorite: string;
}

export const customers: Customer[] = [
  { id: "c-01", name: "Ayesha Khan", initials: "AK", phone: "+92 300 1234567", address: "Gulberg, Lahore", tier: "Gold", stamps: 8, visits: 64, spend: 2480.5, lastVisit: "Today", favorite: "Café Latte" },
  { id: "c-02", name: "Bilal Ahmed", initials: "BA", phone: "+92 321 9876543", address: "Gulberg, Lahore", tier: "Silver", stamps: 5, visits: 38, spend: 1310.0, lastVisit: "Yesterday", favorite: "Flat White" },
  { id: "c-03", name: "Sana Malik", initials: "SM", phone: "+92 333 4455667", address: "Gulberg, Lahore", tier: "Gold", stamps: 9, visits: 71, spend: 3105.75, lastVisit: "2 days ago", favorite: "Iced Mocha" },
  { id: "c-04", name: "Hamza Riaz", initials: "HR", phone: "+92 345 1122334", address: "Gulberg, Lahore", tier: "Bronze", stamps: 2, visits: 9, spend: 268.4, lastVisit: "4 days ago", favorite: "Cold Brew" },
  { id: "c-05", name: "Fatima Noor", initials: "FN", phone: "+92 302 7788990", address: "Gulberg, Lahore", tier: "Silver", stamps: 6, visits: 41, spend: 1588.2, lastVisit: "1 week ago", favorite: "Cappuccino" },
];

export interface SaleRecord {
  id: string;
  invoice: string;
  date: string;
  time: string;
  customer: string;
  channel: "Dine-in" | "Takeaway" | "Delivery";
  method: "Cash" | "Card" | "Wallet";
  cashier: string;
  items: number;
  subtotal: number;
  tax: number;
  total: number;
  status: "Paid" | "Refunded" | "Void";
}

export const sales: SaleRecord[] = [
  { id: "s-1", invoice: "INV-GUL-T01-0134", date: "Nov 25", time: "9:12 AM", customer: "Ayesha Khan", channel: "Dine-in", method: "Card", cashier: "Sara Ahmed", items: 3, subtotal: 10.52, tax: 1.68, total: 12.2, status: "Paid" },
  { id: "s-2", invoice: "INV-GUL-T01-0133", date: "Nov 25", time: "9:08 AM", customer: "Walk-in", channel: "Takeaway", method: "Cash", cashier: "Sara Ahmed", items: 2, subtotal: 7.67, tax: 1.23, total: 8.9, status: "Paid" },
  { id: "s-3", invoice: "INV-GUL-T01-0132", date: "Nov 25", time: "9:01 AM", customer: "Bilal Ahmed", channel: "Dine-in", method: "Card", cashier: "Sara Ahmed", items: 4, subtotal: 23.28, tax: 3.72, total: 27.0, status: "Paid" },
  { id: "s-4", invoice: "INV-GUL-T01-0131", date: "Nov 25", time: "8:54 AM", customer: "Sana Malik", channel: "Dine-in", method: "Wallet", cashier: "Usman Tariq", items: 2, subtotal: 7.93, tax: 1.27, total: 9.2, status: "Paid" },
  { id: "s-5", invoice: "INV-GUL-T01-0130", date: "Nov 25", time: "8:47 AM", customer: "Walk-in", channel: "Delivery", method: "Cash", cashier: "Usman Tariq", items: 2, subtotal: 12.33, tax: 1.97, total: 14.3, status: "Refunded" },
  { id: "s-6", invoice: "INV-GUL-T01-0129", date: "Nov 25", time: "8:31 AM", customer: "Hamza Riaz", channel: "Takeaway", method: "Card", cashier: "Usma Tariq", items: 1, subtotal: 4.66, tax: 0.74, total: 5.4, status: "Paid" },
  { id: "s-7", invoice: "INV-GUL-T01-0128", date: "Nov 24", time: "8:02 PM", customer: "Fatima Noor", channel: "Dine-in", method: "Card", cashier: "Usman Tariq", items: 5, subtotal: 36.21, tax: 5.79, total: 42.0, status: "Paid" },
  { id: "s-8", invoice: "INV-GUL-T01-0127", date: "Nov 24", time: "7:48 PM", customer: "Walk-in", channel: "Takeaway", method: "Cash", cashier: "Sara Ahmed", items: 2, subtotal: 8.62, tax: 1.38, total: 10.0, status: "Paid" },
];

export const revenueWeek = [
  { label: "Mon", value: 3820 },
  { label: "Tue", value: 4210 },
  { label: "Wed", value: 3980 },
  { label: "Thu", value: 4650 },
  { label: "Fri", value: 5420 },
  { label: "Sat", value: 6310 },
  { label: "Sun", value: 4820 },
];

export const hourlySales = [
  120, 180, 260, 480, 640, 720, 580, 520, 610, 690, 740, 880, 960, 820, 640, 520, 430, 380,
];

export const categoryMix = [
  { label: "Coffee", value: 2184.5, ratio: 0.45 },
  { label: "Bakery", value: 1456.2, ratio: 0.3 },
  { label: "Cold drinks", value: 776.8, ratio: 0.16 },
  { label: "Sandwiches", value: 436.9, ratio: 0.09 },
];

export const topProducts = [
  { name: "Café Latte", qty: 42, revenue: 189.0 },
  { name: "Cappuccino", qty: 31, revenue: 130.2 },
  { name: "Flat White", qty: 28, revenue: 134.4 },
  { name: "Iced Mocha", qty: 26, revenue: 140.4 },
  { name: "Chicken Panini", qty: 21, revenue: 186.9 },
];

export const paymentMix = [
  { label: "Card", value: 54, color: "#B44326" },
  { label: "Cash", value: 31, color: "#3F5E27" },
  { label: "Wallet", value: 15, color: "#2F5372" },
];
