import type { JournalEntry } from "./data/ops";
import type { JournalRow } from "./db/repo";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** `Nov 25` from a posted-at timestamp. */
export function entryDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return months[date.getMonth()] + " " + date.getDate();
}

export function journalFromRow(row: JournalRow): JournalEntry {
  return {
    date: entryDate(row.posted_at),
    ref: row.ref,
    description: row.description,
    debit: row.debit,
    credit: row.credit,
    amount: Number(row.amount_cents) / 100,
    status: row.status === "Draft" ? "Draft" : "Posted",
  };
}

/** Session postings first, then sqlite, then the design fixtures. */
export function mergeJournal(
  persisted: JournalEntry[],
  session: JournalEntry[],
  fixtures: JournalEntry[],
): JournalEntry[] {
  const entries: JournalEntry[] = [];
  const seen = new Set<string>();
  for (const entry of [...session, ...persisted, ...fixtures]) {
    if (seen.has(entry.ref)) continue;
    seen.add(entry.ref);
    entries.push(entry);
  }
  return entries;
}
