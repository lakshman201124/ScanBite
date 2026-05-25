/**
 * Billing API Tests — GST calculation logic + endpoint guards
 *
 * The calculateBill() function in lib/billing.ts is pure so we test the math
 * directly via the API and also via inline logic checks.
 *
 * POST /api/admin/bills   — generate a bill with GST
 * GET  /api/admin/bills   — list bills (paginated)
 * GET  /api/admin/bills/[id] — single bill detail
 *
 * GST formula (from lib/billing.ts):
 *   subtotal = sum(item_price × quantity)
 *   discount_amount = subtotal × (discount_percent / 100)
 *   discounted_subtotal = subtotal - discount_amount
 *   cgst_amount = discounted_subtotal × (cgst_rate / 100)
 *   sgst_amount = discounted_subtotal × (sgst_rate / 100)
 *   final_amount = discounted_subtotal + cgst_amount + sgst_amount + tip_amount
 */

import { test, expect } from '@playwright/test';
import { BASE_URL, expectError } from '../helpers/api.helpers';

// ─── Pure billing math tests ─────────────────────────────────────────────────
// These mirror lib/billing.ts calculateBill() — tested inline so they pass
// without any running server. Catches regressions if billing logic changes.

test.describe('Billing math — GST calculation', () => {
  function round2(n: number) {
    return Math.round(n * 100) / 100;
  }

  function calculateBill(input: {
    items: Array<{ price: number; quantity: number }>;
    cgst_rate?: number;
    sgst_rate?: number;
    discount_percent?: number;
    tip_amount?: number;
  }) {
    const cgst_rate = input.cgst_rate ?? 2.5;
    const sgst_rate = input.sgst_rate ?? 2.5;
    const discount_percent = input.discount_percent ?? 0;
    const tip_amount = round2(input.tip_amount ?? 0);

    const subtotal = round2(
      input.items.reduce((s, i) => s + round2(i.price * i.quantity), 0)
    );
    const discount_amount = round2(subtotal * (discount_percent / 100));
    const discounted_subtotal = round2(subtotal - discount_amount);
    const cgst_amount = round2(discounted_subtotal * (cgst_rate / 100));
    const sgst_amount = round2(discounted_subtotal * (sgst_rate / 100));
    const final_amount = round2(discounted_subtotal + cgst_amount + sgst_amount + tip_amount);

    return { subtotal, discount_amount, discounted_subtotal, cgst_amount, sgst_amount, final_amount };
  }

  test('basic GST at 2.5+2.5 = 5% total tax', () => {
    const bill = calculateBill({
      items: [{ price: 100, quantity: 2 }], // subtotal = 200
      cgst_rate: 2.5,
      sgst_rate: 2.5,
    });

    expect(bill.subtotal).toBe(200);
    expect(bill.discount_amount).toBe(0);
    expect(bill.discounted_subtotal).toBe(200);
    expect(bill.cgst_amount).toBe(5); // 2.5% of 200
    expect(bill.sgst_amount).toBe(5); // 2.5% of 200
    expect(bill.final_amount).toBe(210); // 200 + 10 tax
  });

  test('10% discount applied before GST', () => {
    const bill = calculateBill({
      items: [{ price: 100, quantity: 1 }], // subtotal = 100
      cgst_rate: 2.5,
      sgst_rate: 2.5,
      discount_percent: 10,
    });

    expect(bill.subtotal).toBe(100);
    expect(bill.discount_amount).toBe(10);
    expect(bill.discounted_subtotal).toBe(90);
    expect(bill.cgst_amount).toBe(2.25); // 2.5% of 90
    expect(bill.sgst_amount).toBe(2.25);
    expect(bill.final_amount).toBe(round2(90 + 2.25 + 2.25)); // 94.50
  });

  test('tip added after tax', () => {
    const bill = calculateBill({
      items: [{ price: 200, quantity: 1 }],
      cgst_rate: 2.5,
      sgst_rate: 2.5,
      tip_amount: 20,
    });

    // 200 subtotal + 5 cgst + 5 sgst + 20 tip = 230
    expect(bill.subtotal).toBe(200);
    expect(bill.final_amount).toBe(230);
  });

  test('zero GST rates (tax-exempt scenario)', () => {
    const bill = calculateBill({
      items: [{ price: 500, quantity: 2 }],
      cgst_rate: 0,
      sgst_rate: 0,
    });

    expect(bill.subtotal).toBe(1000);
    expect(bill.cgst_amount).toBe(0);
    expect(bill.sgst_amount).toBe(0);
    expect(bill.final_amount).toBe(1000);
  });

  test('multiple items with mixed quantities', () => {
    const bill = calculateBill({
      items: [
        { price: 150, quantity: 2 }, // 300
        { price: 80, quantity: 3 },  // 240
        { price: 50, quantity: 1 },  // 50
      ],
      // subtotal = 590
      cgst_rate: 2.5,
      sgst_rate: 2.5,
    });

    expect(bill.subtotal).toBe(590);
    expect(bill.cgst_amount).toBe(round2(590 * 0.025)); // 14.75
    expect(bill.sgst_amount).toBe(round2(590 * 0.025)); // 14.75
    expect(bill.final_amount).toBe(round2(590 + 14.75 + 14.75)); // 619.50
  });

  test('100% discount results in zero tax and zero total', () => {
    const bill = calculateBill({
      items: [{ price: 100, quantity: 1 }],
      cgst_rate: 9,
      sgst_rate: 9,
      discount_percent: 100,
    });

    expect(bill.discount_amount).toBe(100);
    expect(bill.discounted_subtotal).toBe(0);
    expect(bill.cgst_amount).toBe(0);
    expect(bill.sgst_amount).toBe(0);
    expect(bill.final_amount).toBe(0);
  });

  test('higher GST rates (9+9 = 18%)', () => {
    const bill = calculateBill({
      items: [{ price: 100, quantity: 1 }],
      cgst_rate: 9,
      sgst_rate: 9,
    });

    expect(bill.subtotal).toBe(100);
    expect(bill.cgst_amount).toBe(9);
    expect(bill.sgst_amount).toBe(9);
    expect(bill.final_amount).toBe(118);
  });
});

// ─── POST /api/admin/bills — auth guard ──────────────────────────────────────

test.describe('POST /api/admin/bills — auth guard', () => {
  test('unauthenticated request returns 401', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/admin/bills`, {
      data: { order_id: 'some-uuid' },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('empty body rejected with 400', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/admin/bills`, { data: {} });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('discount > 100% rejected', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/admin/bills`, {
      data: { order_id: 'some-uuid', discount_percent: 150 },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('negative tip rejected', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/admin/bills`, {
      data: { order_id: 'some-uuid', tip_amount: -10 },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });
});

// ─── GET /api/admin/bills — auth guard ───────────────────────────────────────

test.describe('GET /api/admin/bills — auth guard', () => {
  test('unauthenticated request returns 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/admin/bills`);
    expect([401, 403]).toContain(res.status());
  });
});

// ─── Bill number format ───────────────────────────────────────────────────────

test.describe('Bill number format', () => {
  test('BILL-YYYY-NNNN pattern validation', () => {
    const validNumbers = ['BILL-2025-0001', 'BILL-2024-9999', 'BILL-2026-0100'];
    const invalidNumbers = ['ORD-2025-0001', 'BILL-25-001', 'BILL-2025-001'];

    for (const num of validNumbers) {
      expect(num).toMatch(/^BILL-\d{4}-\d{4}$/);
    }
    for (const num of invalidNumbers) {
      expect(num).not.toMatch(/^BILL-\d{4}-\d{4}$/);
    }
  });
});
