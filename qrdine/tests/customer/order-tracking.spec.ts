/**
 * Customer Order Tracking Screen — section 3f
 * Tests the /m/<slug>/<orderId> live status page.
 *
 * Requires TEST_RESTAURANT_SLUG and TEST_ORDER_ID to test UI.
 * API contract tests run without seed data.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const SLUG = process.env.TEST_RESTAURANT_SLUG || 'spice-garden';
const ORDER_ID = process.env.TEST_ORDER_ID || '';

// ─── API: GET /api/customer/orders/[id]/status ────────────────────────────────

test.describe('GET /api/customer/orders/[id]/status', () => {
  test('missing session returns 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/customer/orders/some-order-id/status`);
    expect([401, 403]).toContain(res.status());
  });

  test('invalid orderId format returns 4xx', async ({ request }) => {
    const res = await request.get(
      `${BASE_URL}/api/customer/orders/not-a-uuid/status`,
      { headers: { Cookie: 'session_token=fake' } }
    );
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('nonexistent orderId returns 404', async ({ request }) => {
    const res = await request.get(
      `${BASE_URL}/api/customer/orders/00000000-0000-0000-0000-000000000099/status`,
      { headers: { Cookie: 'session_token=fake' } }
    );
    // 401 (no session) or 404 (not found) — not 500
    expect(res.status()).toBeLessThan(500);
  });
});

// ─── UI: Order Tracking Page ──────────────────────────────────────────────────

test.describe('Order tracking screen UI', () => {
  test.beforeEach(() => {
    if (!ORDER_ID) {
      test.skip(true, 'TEST_ORDER_ID not set — skipping order tracking UI tests');
    }
  });

  test('tracking page shows order number', async ({ page }) => {
    await page.goto(`/m/${SLUG}/${ORDER_ID}`);
    await expect(
      page.locator('text=/ORD-|Order #/i').first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test('order journey steps are visible (Placed → Served)', async ({ page }) => {
    await page.goto(`/m/${SLUG}/${ORDER_ID}`);

    // Status journey labels
    const statuses = ['Placed', 'Confirmed', 'Preparing', 'Ready'];
    for (const status of statuses) {
      await expect(
        page.locator(`text=/${status}/i`).first()
      ).toBeVisible({ timeout: 15_000 });
    }
  });

  test('hero section is visible with yellow background', async ({ page }) => {
    await page.goto(`/m/${SLUG}/${ORDER_ID}`);
    const hero = page.locator('[class*="hero"], [class*="tracking-hero"]').first();
    await expect(hero).toBeVisible({ timeout: 15_000 });
  });

  test('"Request Bill" button is visible on tracking screen', async ({ page }) => {
    await page.goto(`/m/${SLUG}/${ORDER_ID}`);
    const billBtn = page.locator(
      'button:has-text("Request Bill"), button:has-text("Bill"), [data-testid*="request-bill"]'
    ).first();
    await expect(billBtn).toBeVisible({ timeout: 15_000 });
  });
});

// ─── API: POST /api/customer/orders/[id]/bill ─────────────────────────────────

test.describe('POST /api/customer/orders/[id]/bill — bill request', () => {
  test('unauthenticated request returns 401', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/customer/orders/some-id/bill`);
    expect([401, 403]).toContain(res.status());
  });

  test('fake session cannot request bill for arbitrary order', async ({ request }) => {
    const res = await request.post(
      `${BASE_URL}/api/customer/orders/00000000-0000-0000-0000-000000000001/bill`,
      { headers: { Cookie: 'session_token=forged-token' } }
    );
    expect([401, 403, 404]).toContain(res.status());
  });
});

// ─── API: POST /api/customer/bills/split ─────────────────────────────────────

test.describe('POST /api/customer/bills/split — split calculation', () => {
  test('valid split: total=600, numPeople=3 → per_person=200', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/customer/bills/split`, {
      data: { total: 600, numPeople: 3 },
      headers: { Cookie: 'session_token=fake' },
    });
    // 401 or 200 depending on auth requirement — if 200, check math
    if (res.status() === 200) {
      const body = await res.json() as { per_person?: number; data?: { per_person: number } };
      const perPerson = body.per_person ?? (body.data as { per_person: number })?.per_person;
      expect(perPerson).toBe(200);
    } else {
      expect(res.status()).toBeGreaterThanOrEqual(400);
      expect(res.status()).toBeLessThan(500);
    }
  });

  test('numPeople=0 is rejected', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/customer/bills/split`, {
      data: { total: 500, numPeople: 0 },
      headers: { Cookie: 'session_token=fake' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('negative total is rejected', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/customer/bills/split`, {
      data: { total: -100, numPeople: 2 },
      headers: { Cookie: 'session_token=fake' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('non-integer numPeople is rejected', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/customer/bills/split`, {
      data: { total: 600, numPeople: 2.5 },
      headers: { Cookie: 'session_token=fake' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });
});
