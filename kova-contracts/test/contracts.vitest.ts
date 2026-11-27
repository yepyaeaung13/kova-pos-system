import { describe, expect, it } from 'vitest';
import {
  SUBJECTS,
  calcGrandTotalCents,
  calcGstExclusiveCents,
  calcLineTotalCents,
  validateGrnReceivedEvent,
  validateSaleCompletedEvent,
} from '../src/index.js';

describe('money math', () => {
  it('uses integer cents and deterministic GST', () => {
    const line = calcLineTotalCents(3, 1500);
    expect(line).toBe(4500);

    const gst = calcGstExclusiveCents(4500);
    expect(gst).toBe(720);

    expect(calcGrandTotalCents(4500, 500, gst)).toBe(4720);
  });
});

describe('event contracts', () => {
  it('accepts a valid sale event', () => {
    expect(
      validateSaleCompletedEvent.Check({
        eventId: 'evt-1',
        subject: SUBJECTS.SALE_COMPLETED,
        occurredAt: '2026-01-01T00:00:00.000Z',
        branchId: 'branch-1',
        data: {
          sourceType: 'sale_invoice',
          sourceId: 'invoice-1',
          docNo: 'INV-1',
          paymentMethod: 'Cash',
          paymentStatus: 'Paid',
          subtotalCents: 4500,
          discountCents: 0,
          gstCents: 720,
          grandTotalCents: 5220,
          items: [{ productId: 'product-1', qty: 3, unitPriceCents: 1500, lineTotalCents: 4500 }],
        },
      })
    ).toBe(true);
  });

  it('rejects a GRN event with an invalid payment status', () => {
    expect(
      validateGrnReceivedEvent.Check({
        eventId: 'evt-2',
        subject: SUBJECTS.INVENTORY_GRN_RECEIVED,
        occurredAt: '2026-01-01T00:00:00.000Z',
        branchId: 'branch-1',
        data: {
          grnId: 'grn-1',
          grnNo: 'GRN-1',
          supplierId: 'supplier-1',
          supplierInvoiceNo: 'SI-1',
          subtotalCents: 1000,
          taxCents: 160,
          totalCents: 1160,
          paymentStatus: 'Maybe',
        },
      })
    ).toBe(false);
  });
});
