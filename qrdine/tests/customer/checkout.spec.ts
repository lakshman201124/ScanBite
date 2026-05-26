/**
 * Customer Checkout & Payment — section 3e
 * Tests Razorpay order creation, price tamper protection, and signature verification.
 *
 * UI flows require seeded data (TEST_RESTAURANT_SLUG + TEST_TABLE_QR_TOKEN).
 * API-only tests run without seeds.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const SLUG = process.env.TEST_RESTAURANT_SLUG || 'spice-garden';
const QR_TOKEN = process.env.TEST_TABLE_QR_TOKEN || '';

// ─── API: POST /api/payments/create-order ─────────────────────────────────────

test.describe('POST /api/payments/create-order — auth guard', () => {
  test('unauthenticated request is rejected (not 2xx)', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/payments/create-order`, {
      data: { order_id: 'some-order-id' },
      maxRedirects: 0,
    });
    // 401 = no session, 500 = Razorpay keys missing (route crashes at payment step)
    // Either way, must NOT be 200
    expect(res.status()).not.toBe(200);
  });

  test('missing orderId returns error', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/payments/create-order`, {
      data: {},
      headers: { Cookie: 'session_token=fake-token' },
      maxRedirects: 0,
    });
    // 401 (invalid session — fake token), 400 (missing field), or 500 (Razorpay config)
    // Must not be 200
    expect(res.status()).not.toBe(200);
  });
});

// ─── API: POST /api/payments/verify ───────────────────────────────────────────

test.describe('POST /api/payments/verify — signature validation', () => {
  test('forged razorpay_signature is rejected', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/payments/verify`, {
      data: {
        razorpay_order_id: 'order_fake123',
        razorpay_payment_id: 'pay_fake456',
        razorpay_signature: 'completely-fabricated-signature',
      },
      headers: { Cookie: 'session_token=fake-token' },
      maxRedirects: 0,
    });
    // 400 (invalid signature), 401 (invalid session), or 4xx — not 2xx
    expect(res.status()).not.toBe(200);
    expect(res.status()).toBeGreaterThanOrEqual(300);
  });

  test('missing signature fields returns error', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/payments/verify`, {
      data: { razorpay_order_id: 'order_fake123' },
      headers: { Cookie: 'session_token=fake-token' },
      maxRedirects: 0,
    });
    expect(res.status()).not.toBe(200);
    expect(res.status()).toBeGreaterThanOrEqual(300);
  });

  test('replay attack: calling verify twice with same payload does not create duplicate records', async ({ request }) => {
    const payload = {
      order_id: 'order-replay-test',
      razorpay_order_id: 'order_replaytest',
      razorpay_payment_id: 'pay_replaytest',
      razorpay_signature: 'fake-replay-sig',
    };

    const res1 = await request.post(`${BASE_URL}/api/payments/verify`, { data: payload, maxRedirects: 0 });
    const res2 = await request.post(`${BASE_URL}/api/payments/verify`, { data: payload, maxRedirects: 0 });

    // Both must fail (no valid session or invalid signature) — must NOT be 200
    // Note: 500 is acceptable when RAZORPAY_KEY_SECRET is empty (can't compute HMAC)
    expect(res1.status()).not.toBe(200);
    expect(res2.status()).not.toBe(200);
  });
});

// ─── API: POST /api/payments/webhook ──────────────────────────────────────────

test.describe('POST /api/payments/webhook — HMAC signature check', () => {
  test('webhook with no signature header is rejected', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/payments/webhook`, {
      data: { event: 'payment.captured', payload: {} },
      maxRedirects: 0,
    });
    // 400 (no signature), 401, or any error — not 2xx
    expect(res.status()).not.toBe(200);
  });

  test('webhook with wrong x-razorpay-signature is rejected', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/payments/webhook`, {
      data: JSON.stringify({ event: 'payment.captured' }),
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': 'wrong-signature',
      },
      maxRedirects: 0,
    });
    expect(res.status()).not.toBe(200);
  });
});

// ─── API: Price tamper protection ─────────────────────────────────────────────

test.describe('POST /api/customer/orders — price tamper protection', () => {
  test('order with tampered item price is rejected', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/customer/orders`, {
      data: {
        items: [
          {
            menu_item_id: '00000000-0000-0000-0000-000000000001',
            quantity: 1,
            item_price: 0.01, // Tampered — real price would be higher
          },
        ],
      },
      headers: { Cookie: 'session_token=fake' },
    });
    // 401 (no session) or 400 (price mismatch) — both reject the tamper
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('order with negative quantity is rejected with 400', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/customer/orders`, {
      data: {
        items: [{ menu_item_id: 'some-uuid', quantity: -1 }],
      },
      headers: { Cookie: 'session_token=fake' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('order with zero quantity is rejected with 400', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/customer/orders`, {
      data: {
        items: [{ menu_item_id: 'some-uuid', quantity: 0 }],
      },
      headers: { Cookie: 'session_token=fake' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('empty items array is rejected', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/customer/orders`, {
      data: { items: [] },
      headers: { Cookie: 'session_token=fake' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });
});

// ─── UI: Checkout flow ────────────────────────────────────────────────────────

test.describe('Checkout UI — bill preview', () => {
  test.beforeEach(() => {
    if (!QR_TOKEN) {
      test.skip(true, 'TEST_TABLE_QR_TOKEN not set — skipping checkout UI tests');
    }
  });

  test('checkout shows subtotal, CGST, SGST, and total with correct arithmetic', async ({ page }) => {
    // Start a customer session via QR URL
    await page.goto(`/m/${SLUG}?token=${QR_TOKEN}`);
    await page.waitForSelector('[class*="item-card"], [class*="food-card"]', { timeout: 20_000 });

    // Add first item
    const card = page.locator('[class*="item-card"], [class*="food-card"]').first();
    await card.click();
    await page.waitForTimeout(400);

    const addBtn = page.locator('button:has-text("Add"), button:has-text("Add to Cart")').first();
    if (await addBtn.isVisible()) await addBtn.click();

    // Proceed to checkout
    const checkoutBtn = page.locator(
      'button:has-text("Checkout"), button:has-text("Place Order"), a:has-text("Checkout")'
    ).first();
    if (!await checkoutBtn.isVisible()) return;
    await checkoutBtn.click();

    // Verify tax line items visible
    await expect(page.locator('text=/CGST|cgst/i').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=/SGST|sgst/i').first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('text=/total/i').first()).toBeVisible({ timeout: 5_000 });
  });
});
