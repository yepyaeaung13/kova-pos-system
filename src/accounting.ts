import type { Account } from "./data/ops";

/** A line of the P&L, already valued and scaled to revenue. */
export interface PnlLine {
  label: string;
  value: number;
  ratio: number;
}

export interface PnlSummary {
  revenue: number;
  cogs: number;
  gross: number;
  operating: number;
  expenses: number;
  net: number;
  lines: PnlLine[];
}

export function balanceOf(accounts: Account[], code: string): number {
  return accounts.find((account) => account.code === code)?.balance ?? 0;
}

/**
 * The P&L from the posted account balances: revenue 4000/4100, COGS 5000 and
 * operating costs 5100–5400. Ratios are shares of revenue, like the design.
 */
export function pnlFromAccounts(accounts: Account[]): PnlSummary {
  const revenue = balanceOf(accounts, "4000") + balanceOf(accounts, "4100");
  const cogs = balanceOf(accounts, "5000");
  const operating =
    balanceOf(accounts, "5100") +
    balanceOf(accounts, "5200") +
    balanceOf(accounts, "5300") +
    balanceOf(accounts, "5400");
  const gross = revenue - cogs;
  const ratio = (value: number) => (revenue > 0 ? value / revenue : 0);
  const lines: PnlLine[] = [
    { label: "Food & beverage sales", value: balanceOf(accounts, "4000") },
    { label: "Merchandise", value: balanceOf(accounts, "4100") },
    { label: "Cost of goods sold", value: cogs },
    { label: "Salaries & wages", value: balanceOf(accounts, "5200") },
    { label: "Rent", value: balanceOf(accounts, "5100") },
    { label: "Utilities", value: balanceOf(accounts, "5300") },
    { label: "Waste & spoilage", value: balanceOf(accounts, "5400") },
  ].map((line) => ({ ...line, ratio: ratio(line.value) }));

  return {
    revenue,
    cogs,
    gross,
    operating,
    expenses: cogs + operating,
    net: gross - operating,
    lines,
  };
}
