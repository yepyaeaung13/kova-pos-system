/** Money and number formatting for the POS: two decimals, tabular digits. */

const grouped = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const plain = new Intl.NumberFormat("en-US");

/** `$1,234.50` */
export function money(value: number): string {
  return "$" + grouped.format(value);
}

/** `$1,234` — no cents, for summary rows of whole amounts. */
export function moneyShort(value: number): string {
  return "$" + plain.format(Math.round(value));
}

/** `1,234` */
export function count(value: number): string {
  return plain.format(value);
}

/** `12.5%` */
export function percent(value: number, digits = 1): string {
  return value.toFixed(digits) + "%";
}

/** `+12.4%` / `−3.1%` */
export function delta(value: number, digits = 1): string {
  const sign = value > 0 ? "+" : value < 0 ? "\u2212" : "";
  return sign + Math.abs(value).toFixed(digits) + "%";
}

/** `09:41` from minutes since midnight. */
export function clock(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.floor(minutes % 60);
  return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
}

/** `8:00 AM` from minutes since midnight. */
export function clock12(minutes: number): string {
  const h24 = Math.floor(minutes / 60) % 24;
  const m = Math.floor(minutes % 60);
  const suffix = h24 < 12 ? "AM" : "PM";
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return h + ":" + String(m).padStart(2, "0") + " " + suffix;
}
