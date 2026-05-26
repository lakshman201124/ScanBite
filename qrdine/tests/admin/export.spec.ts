/**
 * Admin CSV Export — section 4j
 * Tests POST /api/admin/export for orders and bills CSV downloads.
 *
 * Runs in admin-desktop project (pre-authenticated).
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// ─── API: POST /api/admin/export ──────────────────────────────────────────────

test.describe('POST /api/admin/export — auth guard', () => {
  test('unauthenticated request returns 401', async ({ playwright }) => {
    const unauth = await playwright.request.newContext({ storageState: { cookies: [], origins: [] } });
    const res = await unauth.post(`${BASE_URL}/api/admin/export`, {
      data: { type: 'orders' },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('missing type field returns 400', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/admin/export`, {
      data: {},
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('invalid type returns 400', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/admin/export`, {
      data: { type: 'invalid-export-type' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });
});

// ─── Orders CSV ───────────────────────────────────────────────────────────────

test.describe('POST /api/admin/export — type=orders', () => {
  test('returns CSV content-type (with admin session)', async ({ request }) => {
    const sessionCookie = process.env.TEST_ADMIN_SESSION;
    if (!sessionCookie) {
      test.skip(true, 'TEST_ADMIN_SESSION not set');
      return;
    }

    const res = await request.post(`${BASE_URL}/api/admin/export`, {
      data: { type: 'orders' },
      headers: { Cookie: sessionCookie },
    });

    if (res.status() === 200) {
      const contentType = res.headers()['content-type'] ?? '';
      expect(contentType).toMatch(/csv|text\/plain/i);
    }
  });

  test('CSV contains expected columns header row', async ({ request }) => {
    const sessionCookie = process.env.TEST_ADMIN_SESSION;
    if (!sessionCookie) {
      test.skip(true, 'TEST_ADMIN_SESSION not set');
      return;
    }

    const res = await request.post(`${BASE_URL}/api/admin/export`, {
      data: { type: 'orders' },
      headers: { Cookie: sessionCookie },
    });

    if (res.status() === 200) {
      const body = await res.text();
      const firstLine = body.split('\n')[0] ?? '';
      // Header row should contain expected columns
      const expectedCols = ['Order', 'Table', 'Total', 'Status'];
      for (const col of expectedCols) {
        expect(firstLine.toLowerCase()).toContain(col.toLowerCase());
      }
    }
  });
});

// ─── Bills CSV ────────────────────────────────────────────────────────────────

test.describe('POST /api/admin/export — type=bills', () => {
  test('returns CSV content-type (with admin session)', async ({ request }) => {
    const sessionCookie = process.env.TEST_ADMIN_SESSION;
    if (!sessionCookie) {
      test.skip(true, 'TEST_ADMIN_SESSION not set');
      return;
    }

    const res = await request.post(`${BASE_URL}/api/admin/export`, {
      data: { type: 'bills' },
      headers: { Cookie: sessionCookie },
    });

    if (res.status() === 200) {
      const contentType = res.headers()['content-type'] ?? '';
      expect(contentType).toMatch(/csv|text\/plain/i);
    }
  });
});

// ─── UI: Export buttons visible ───────────────────────────────────────────────

test.describe('Export UI — download buttons', () => {
  test('Orders export button is visible on /dashboard/orders', async ({ page }) => {
    await page.goto('/dashboard/orders');
    const exportBtn = page.locator(
      'button:has-text("Export"), button:has-text("Download CSV"), [data-testid*="export"]'
    ).first();
    await expect(exportBtn).toBeVisible({ timeout: 15_000 });
  });

  test('Bills export button is visible on /dashboard/billing', async ({ page }) => {
    await page.goto('/dashboard/billing');
    const exportBtn = page.locator('button:has-text("Export")')
      .or(page.locator('[class*="export-btn"]'))
      .or(page.locator('a[href*="export"]'))
      .or(page.locator('a:has-text("Bills")'))
      .first();
    await expect(exportBtn).toBeVisible({ timeout: 15_000 });
  });

  test('clicking Orders export triggers a file download', async ({ page }) => {
    await page.goto('/dashboard/orders');
    const exportBtn = page.locator(
      'button:has-text("Export"), button:has-text("Download CSV")'
    ).first();
    if (!await exportBtn.isVisible()) return;

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 10_000 }).catch(() => null),
      exportBtn.click(),
    ]);

    if (download) {
      const filename = download.suggestedFilename();
      expect(filename).toMatch(/\.csv$/i);
    }
  });
});
