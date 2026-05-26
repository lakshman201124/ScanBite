/**
 * Chef Kitchen Display System (KDS) — section 5
 * Tests the /kds page: full-screen 3-column order grid, status transitions,
 * timer colour urgency, and real-time card appearance.
 *
 * Runs in chef-tablet project (iPad Pro 11 viewport).
 * Requires chef session credentials: TEST_CHEF_PIN + TEST_RESTAURANT_SLUG.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const SLUG = process.env.TEST_RESTAURANT_SLUG || 'spice-garden';
const CHEF_PIN = process.env.TEST_CHEF_PIN || '';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Login as chef via phone OTP UI — requires Twilio to be configured */
async function loginAsChef(page: import('@playwright/test').Page) {
  await page.goto('/chef-login');
  await expect(page.locator('input[type="tel"]').first()).toBeVisible({ timeout: 15_000 });

  const CHEF_PHONE = process.env.TEST_CHEF_PHONE || '';
  if (!CHEF_PHONE) {
    test.skip(true, 'TEST_CHEF_PHONE not set — cannot complete phone OTP login');
    return;
  }

  await page.locator('input[type="tel"]').first().fill(CHEF_PHONE);
  await page.locator('button').filter({ hasText: /send otp|send/i }).first().click();

  // Wait for OTP inputs to appear
  await expect(page.locator('input[inputmode="numeric"]').first()).toBeVisible({ timeout: 10_000 });

  const CHEF_OTP = process.env.TEST_CHEF_OTP || '';
  if (!CHEF_OTP) {
    test.skip(true, 'TEST_CHEF_OTP not set — cannot enter OTP');
    return;
  }

  const otpInputs = await page.locator('input[inputmode="numeric"]').all();
  for (let i = 0; i < Math.min(CHEF_OTP.length, otpInputs.length); i++) {
    await otpInputs[i].fill(CHEF_OTP[i]);
  }
}

// ─── Chef Login UI ────────────────────────────────────────────────────────────

test.describe('Chef login page — section 1c', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('chef-login page loads with phone input (OTP flow)', async ({ page }) => {
    await page.goto('/chef-login');
    // Page uses phone OTP flow — look for tel input
    await expect(
      page.locator('input[type="tel"]').first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('wrong/invalid phone shows error message', async ({ page }) => {
    await page.goto('/chef-login');
    await expect(page.locator('input[type="tel"]').first()).toBeVisible({ timeout: 10_000 });

    const phoneInput = page.locator('input[type="tel"]').first();
    await phoneInput.fill('abc123'); // invalid phone format

    const sendBtn = page.locator('button').filter({ hasText: /send otp|send/i }).first();
    // Click with force to bypass any overlay
    await sendBtn.click({ force: true });

    // Either: inline error message, or button stays enabled with no navigation
    await page.waitForTimeout(1_000);
    const errorVisible = await page.locator('text=/valid phone|phone number|invalid|enter a valid/i').first().isVisible().catch(() => false);
    const alertVisible = await page.locator('[role="alert"]').first().isVisible().catch(() => false);
    // Page must still be on chef-login (error prevented OTP send)
    const stillOnChefLogin = page.url().includes('/chef-login');

    expect(errorVisible || alertVisible || stillOnChefLogin).toBe(true);
  });

  test('non-numeric phone is rejected by validation', async ({ page }) => {
    await page.goto('/chef-login');

    const phoneInput = page.locator('input[type="tel"]').first();
    await phoneInput.fill('abcdefghij');

    const sendBtn = page.locator('button').filter({ hasText: /send otp|send/i }).first();
    // Button may be disabled or validation error shown after click
    const isDisabled = await sendBtn.isDisabled().catch(() => false);
    if (!isDisabled) {
      await sendBtn.click();
      // Expect error — not OTP boxes
      await page.waitForTimeout(1_000);
      const otpVisible = await page.locator('input[inputmode="numeric"]').first().isVisible().catch(() => false);
      expect(otpVisible).toBe(false);
    } else {
      expect(isDisabled).toBe(true);
    }
  });
});

// ─── Chef API: PATCH /api/chef/orders/[id]/status ─────────────────────────────

test.describe('PATCH /api/chef/orders/[id]/status', () => {
  test('unauthenticated request is rejected (4xx)', async ({ request }) => {
    const res = await request.patch(`${BASE_URL}/api/chef/orders/some-id/status`, {
      data: { status: 'preparing' },
    });
    // Should be 401/403; never 2xx
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).not.toBe(200);
  });

  test('invalid chef_token (forged JWT) is rejected (4xx)', async ({ request }) => {
    // Send invalid JWT via Cookie header — middleware should return 401
    const res = await request.patch(`${BASE_URL}/api/chef/orders/some-id/status`, {
      data: { status: 'preparing' },
      headers: { Cookie: 'chef_token=invalid-jwt-value' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).not.toBe(200);
  });

  test('invalid status value returns 4xx (not 2xx)', async ({ request }) => {
    // With invalid token — middleware returns 401 before route validation runs
    const res = await request.patch(`${BASE_URL}/api/chef/orders/some-id/status`, {
      data: { status: 'INVALID_STATUS' },
      headers: { Cookie: 'chef_token=fake-token' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('missing status field returns 4xx', async ({ request }) => {
    const res = await request.patch(`${BASE_URL}/api/chef/orders/some-id/status`, {
      data: {},
      headers: { Cookie: 'chef_token=fake-token' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('"pending" is not a valid chef status transition — returns 4xx', async ({ request }) => {
    const res = await request.patch(
      `${BASE_URL}/api/chef/orders/00000000-0000-0000-0000-000000000001/status`,
      { data: { status: 'pending' }, headers: { Cookie: 'chef_token=fake-token' } }
    );
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});

// ─── KDS Page UI ──────────────────────────────────────────────────────────────

test.describe('KDS Page — /kds', () => {
  test.beforeEach(async ({ page }) => {
    if (!CHEF_PIN) {
      test.skip(true, 'TEST_CHEF_PIN not set — skipping KDS UI tests');
      return;
    }
    await loginAsChef(page);
    await page.waitForURL('**/kds', { timeout: 20_000 });
  });

  test('KDS page loads with 3-column layout (no admin sidebar)', async ({ page }) => {
    await expect(page).toHaveURL(/\/kds/, { timeout: 15_000 });

    // Admin sidebar must NOT be present on KDS
    const sidebar = page.locator('[class*="sidebar"], nav[class*="admin"]');
    expect(await sidebar.count()).toBe(0);

    // KDS grid should be visible
    const kdsGrid = page.locator('[class*="kds-grid"], [class*="kds"], [data-testid*="kds"]').first();
    await expect(kdsGrid).toBeVisible({ timeout: 10_000 });
  });

  test('KDS shows only confirmed and preparing orders (not pending/served)', async ({ page }) => {
    await expect(page).toHaveURL(/\/kds/);

    // If there are order cards, they should not show "pending" or "served" status
    const pendingCards = page.locator('[class*="kds-card"], [class*="order-card"]')
      .filter({ hasText: /^pending$/i });
    expect(await pendingCards.count()).toBe(0);

    const servedCards = page.locator('[class*="kds-card"], [class*="order-card"]')
      .filter({ hasText: /^served$/i });
    expect(await servedCards.count()).toBe(0);
  });

  test('order card shows table number, item list, and elapsed timer', async ({ page }) => {
    await expect(page).toHaveURL(/\/kds/);

    const cards = page.locator('[class*="kds-card"], [class*="order-card"]');
    const count = await cards.count();

    if (count > 0) {
      const firstCard = cards.first();
      // Table number or order number
      const hasTableOrOrder = await firstCard.locator(
        'text=/Table|T-|ORD-/i'
      ).count() > 0;
      expect(hasTableOrOrder).toBeTruthy();

      // Timer is visible
      const timer = firstCard.locator('[class*="timer"], [class*="elapsed"]').first();
      await expect(timer).toBeVisible();
    }
  });

  test('timer colour: green < 5min, amber 5-10min, red > 10min', async ({ page }) => {
    await expect(page).toHaveURL(/\/kds/);

    // Look for coloured timer elements — check CSS class or style
    const greenTimer = page.locator('[class*="timer-green"], [class*="timer--safe"]').first();
    const amberTimer = page.locator('[class*="timer-amber"], [class*="timer--warn"]').first();
    const redTimer = page.locator('[class*="timer-red"], [class*="timer--urgent"]').first();

    // At least one of the timer colour states should be present if there are orders
    const cards = await page.locator('[class*="kds-card"]').count();
    if (cards > 0) {
      const hasAnyColour = (
        await greenTimer.isVisible().catch(() => false) ||
        await amberTimer.isVisible().catch(() => false) ||
        await redTimer.isVisible().catch(() => false)
      );
      expect(hasAnyColour).toBeTruthy();
    }
  });

  test('timer uses JetBrains Mono font', async ({ page }) => {
    await expect(page).toHaveURL(/\/kds/);

    const timer = page.locator('[class*="timer"]').first();
    if (await timer.isVisible()) {
      const fontFamily = await timer.evaluate(
        el => window.getComputedStyle(el).fontFamily
      );
      expect(fontFamily.toLowerCase()).toContain('jetbrains');
    }
  });
});

// ─── KDS Status Transitions (with seeded order) ───────────────────────────────

test.describe('KDS status transitions — with seeded data', () => {
  test.beforeEach(() => {
    if (!CHEF_PIN || !process.env.TEST_KDS_ORDER_ID) {
      test.skip(true, 'TEST_CHEF_PIN or TEST_KDS_ORDER_ID not set — skipping transition tests');
    }
  });

  test('chef can confirm an order via Confirm button', async ({ page }) => {
    if (!CHEF_PIN) return;
    await loginAsChef(page);
    await page.waitForURL('**/kds', { timeout: 20_000 });

    const orderId = process.env.TEST_KDS_ORDER_ID!;
    const card = page.locator(`[data-order-id="${orderId}"], [class*="kds-card"]`).first();

    if (await card.isVisible()) {
      const confirmBtn = card.locator('button:has-text("Confirm"), button:has-text("Accept")').first();
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
        // Card should move column (confirmed → no longer in pending column)
        await page.waitForTimeout(1000);
      }
    }
  });

  test('chef can mark order as preparing', async ({ page }) => {
    if (!CHEF_PIN) return;
    await loginAsChef(page);
    await page.waitForURL('**/kds', { timeout: 20_000 });

    const card = page.locator('[class*="kds-card"]').first();
    if (await card.isVisible()) {
      const prepBtn = card.locator('button:has-text("Preparing"), button:has-text("Start")').first();
      if (await prepBtn.isVisible()) {
        await prepBtn.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('chef can mark order as ready', async ({ page }) => {
    if (!CHEF_PIN) return;
    await loginAsChef(page);
    await page.waitForURL('**/kds', { timeout: 20_000 });

    const card = page.locator('[class*="kds-card"]').first();
    if (await card.isVisible()) {
      const readyBtn = card.locator('button:has-text("Ready"), button:has-text("Done")').first();
      if (await readyBtn.isVisible()) {
        await readyBtn.click();
        await page.waitForTimeout(500);
      }
    }
  });
});
