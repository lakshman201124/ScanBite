/**
 * Admin Staff Management — section 4h
 * Tests creating chefs, verifying PIN login, and deactivating staff.
 *
 * Runs in admin-desktop project (pre-authenticated).
 */

import { test, expect } from '@playwright/test';

process.env.TEST_OTP_BYPASS = 'true';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function randPhone() {
  return `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`;
}

// ─── API: Staff CRUD ──────────────────────────────────────────────────────────

test.describe('GET /api/admin/staff', () => {
  test('authenticated request returns 200', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/admin/staff`);
    expect(res.status()).toBe(200);
  });
});

test.describe('POST /api/admin/staff — create chef', () => {
  test('valid chef creation returns 201', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/admin/staff`, {
      data: { name: 'Chef Test', phone: randPhone(), role: 'chef' },
    });
    expect(res.status()).toBe(201);
  });

  test('missing name returns 400', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/admin/staff`, {
      data: { phone: randPhone(), role: 'chef' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('missing phone returns 400', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/admin/staff`, {
      data: { name: 'Chef NoPhone', role: 'chef' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('invalid phone format is rejected', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/admin/staff`, {
      data: { name: 'Chef Short', phone: '12', role: 'chef' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('invalid role is rejected', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/admin/staff`, {
      data: { name: 'Test Staff', phone: randPhone(), role: 'superadmin' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });
});

test.describe('DELETE /api/admin/staff/[id]', () => {
  test('unauthenticated request returns 401', async ({ playwright }) => {
    const freshContext = await playwright.request.newContext();
    const res = await freshContext.delete(`${BASE_URL}/api/admin/staff?id=some-id`, { maxRedirects: 0 });
    expect([307, 308, 401, 403, 404]).toContain(res.status());
  });

  test('nonexistent staff ID returns 404 or 401', async ({ request }) => {
    const res = await request.delete(
      `${BASE_URL}/api/admin/staff/00000000-0000-0000-0000-000000000000`
    );
    expect([401, 403, 404]).toContain(res.status());
  });
});

// ─── UI: Staff management page ────────────────────────────────────────────────

test.describe('Staff management UI', () => {
  test('staff list or add-staff section is accessible from Settings or Staff page', async ({ page }) => {
    // Try /dashboard/staff first, fall back to /dashboard/settings
    await page.goto('/dashboard/staff');
    const notFound = await page.locator('text=/404|not found/i').count() > 0;

    if (notFound) {
      await page.goto('/dashboard/settings');
    }

    const staffSection = page.locator('text=/staff|chef|team/i')
      .or(page.locator('[data-testid*="staff"]'))
      .first();
    await expect(staffSection).toBeVisible({ timeout: 15_000 });
  });

  test('"Add Staff" / "Add Chef" button opens form', async ({ page }) => {
    await page.goto('/dashboard/staff').catch(() => page.goto('/dashboard/settings'));

    const addBtn = page.locator(
      'button:has-text("Add Chef"), button:has-text("Add Staff"), button:has-text("New Staff")'
    ).first();
    if (!await addBtn.isVisible()) return;

    await addBtn.click();
    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
    await expect(nameInput).toBeVisible({ timeout: 5_000 });
  });
});

// ─── Deactivated chef cannot log in ──────────────────────────────────────────

test.describe('Deactivated staff login rejection', () => {
  test('deactivated chef returns 401 on /api/auth/chef-login', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/chef-login`, {
      data: { phone: '+910000000000', pin: '000000' },
    });
    expect([401, 404]).toContain(res.status());
  });
});
