/**
 * Deterministic integer-cents money & GST math.
 * Never use floating-point dollars for totals or GST.
 * GST rate is configurable via basis points (bps); default 1600 = 16.00%.
 */

export type MoneyCents = number;

/** Line total = qty * unitPriceCents, rounded to nearest cent. */
export function calcLineTotalCents(qty: number, unitPriceCents: MoneyCents): MoneyCents {
  return Math.round(qty * unitPriceCents);
}

/** GST-exclusive portion from a subtotal. gstBps = 1600 => 16.00%. */
export function calcGstExclusiveCents(subtotalCents: MoneyCents, gstBps = 1600): MoneyCents {
  return Math.round((subtotalCents * gstBps) / 10_000);
}

/** Grand total = subtotal - discount + GST, floored at 0. */
export function calcGrandTotalCents(
  subtotalCents: MoneyCents,
  discountCents: MoneyCents,
  gstCents: MoneyCents
): MoneyCents {
  return Math.max(0, subtotalCents - discountCents) + gstCents;
}

/** Default GST rate for Kova tenants (Pakistan 16% sales tax). */
export const DEFAULT_GST_BPS = 1600;
