import type { Payable } from "./data/ops";
import type { VendorBillRow } from "./db/repo";

export type BillStatus = Payable["status"] | "Paid";

/** A supplier bill ready for the payables list or the overview. */
export interface BillView {
  key: string;
  id: string | null;
  vendor: string;
  invoice: string;
  due: string;
  dueIso: string;
  bucket: Payable["bucket"];
  amount: number;
  status: BillStatus;
  grn: string | null;
  paymentRef: string | null;
}

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** `Dec 2` from a stored due date. */
export function dueDayLabel(iso: string): string {
  if (iso === "") return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return months[date.getMonth()] + " " + date.getDate();
}

export function daysUntil(iso: string): number {
  if (iso === "") return 0;
  const due = new Date(iso);
  if (Number.isNaN(due.getTime())) return 0;
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const target = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  return Math.round((target - start) / 86_400_000);
}

export function bucketFor(iso: string): Payable["bucket"] {
  const days = daysUntil(iso);
  if (days < -30) return "31–60 days";
  if (days < 0) return "1–30 days";
  return "Current";
}

export function statusFor(iso: string): Payable["status"] {
  const days = daysUntil(iso);
  if (days < 0) return "Overdue";
  if (days <= 7) return "Due";
  return "Scheduled";
}

export function billFromRow(row: VendorBillRow): BillView {
  const total = Number(row.total_cents);
  const paid = Number(row.paid_cents);
  const settled = paid >= total || row.status === "Paid";
  return {
    key: row.bill_no,
    id: row.id,
    vendor: row.supplier,
    invoice: row.bill_no,
    due: dueDayLabel(row.due_date),
    dueIso: row.due_date,
    bucket: bucketFor(row.due_date),
    amount: (settled ? total : Math.max(0, total - paid)) / 100,
    status: settled ? "Paid" : statusFor(row.due_date),
    grn: row.grn_no,
    paymentRef: row.payment_entry,
  };
}

export function billFromFixture(bill: Payable): BillView {
  return {
    key: bill.invoice,
    id: null,
    vendor: bill.vendor,
    invoice: bill.invoice,
    due: bill.due,
    dueIso: "",
    bucket: bill.bucket,
    amount: bill.amount,
    status: bill.status,
    grn: null,
    paymentRef: null,
  };
}

/** Bills that still need paying, ordered overdue first, then by due date. */
export function openBills(bills: BillView[]): BillView[] {
  return bills
    .filter((bill) => bill.status !== "Paid")
    .sort((a, b) => {
      if (a.status === "Overdue" && b.status !== "Overdue") return -1;
      if (b.status === "Overdue" && a.status !== "Overdue") return 1;
      if (a.dueIso && b.dueIso) return a.dueIso < b.dueIso ? -1 : 1;
      return 0;
    });
}
