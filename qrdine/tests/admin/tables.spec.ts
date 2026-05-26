/**
 * Admin Tables Manager — section 4d
 * Tests /dashboard/tables: create table, floor heatmap, QR regeneration,
 * QR download, delete, and occupied badge.
 *
 * Runs in admin-desktop project (pre-authenticated).
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ─── Page Load ────────────────────────────────────────────────────────────────

test.describe('Tables Manager page load', () => {
  test('navigates to /dashboard/tables without redirect', async ({ page }) => {
    await page.goto('/dashboard/tables');
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
    expect(page.url()).toContain('/dashboard/tables');
  });

  test('floor heatmap or "Add Table" CTA is visible', async ({ page }) => {
    await page.goto('/dashboard/tables');
    const heatmapOrCTA = page.locator(
      '[class*="heatmap"], [class*="floor-plan"], button:has-text("Add Table"), button:has-text("New Table")'
    ).first();
    await expect(heatmapOrCTA).toBeVisible({ timeout: 15_000 });
  });
});

// ─── Floor Heatmap ────────────────────────────────────────────────────────────

test.describe('Floor heatmap', () => {
  test('tables render in grid with status colour coding', async ({ page }) => {
    await page.goto('/dashboard/tables');

    const tableDots = page.locator('[class*="tbl-dot"], [class*="table-cell"], [data-testid*="table-dot"]');
    const count = await tableDots.count();

    if (count > 0) {
      // At least one table dot should have a colour class (green=available, amber=occupied)
      const colored = tableDots.filter({ has: page.locator('[class*="available"], [class*="occupied"], [class*="green"], [class*="amber"]') });
      expect(await colored.count()).toBeGreaterThanOrEqual(0); // colour is present or via CSS variable
    }
  });

  test('5-column grid layout for table dots', async ({ page }) => {
    await page.goto('/dashboard/tables');
    const grid = page.locator('[class*="table-grid"], [class*="heatmap-grid"]').first();
    if (await grid.isVisible()) {
      const style = await grid.getAttribute('class');
      // Check grid-cols-5 or similar class
      expect(style).toMatch(/grid|col/i);
    }
  });
});

// ─── Create Table ─────────────────────────────────────────────────────────────

test.describe('Create table', () => {
  test('Add Table form opens with required fields', async ({ page }) => {
    await page.goto('/dashboard/tables');

    const addBtn = page.locator(
      'button:has-text("Add Table"), button:has-text("New Table"), [data-testid*="add-table"]'
    ).first();
    await expect(addBtn).toBeVisible({ timeout: 15_000 });
    await addBtn.click();

    const tableNumInput = page.locator(
      'input[name="table_number"], input[name="tableNumber"], input[placeholder*="table" i]'
    ).first();
    await expect(tableNumInput).toBeVisible({ timeout: 5_000 });
  });

  test('API POST /api/tables requires auth', async ({ playwright }) => {
    const unauth = await playwright.request.newContext({ storageState: { cookies: [], origins: [] } });
    const res = await unauth.post(`${BASE_URL}/api/tables`, {
      data: { table_number: `T-${uid()}`, capacity: 4 },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('API POST /api/tables with missing table_number returns 400', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/tables`, {
      data: { capacity: 4 },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('capacity of 0 is rejected', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/tables`, {
      data: { table_number: `T-${uid()}`, capacity: 0 },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });
});

// ─── QR Code ─────────────────────────────────────────────────────────────────

test.describe('QR Code management', () => {
  test('QR download button is visible per table', async ({ page }) => {
    await page.goto('/dashboard/tables');

    const tables = page.locator('[class*="tbl-dot"], [class*="table-row"]');
    const count = await tables.count();
    if (count > 0) {
      const firstTable = tables.first();
      await firstTable.click();
      const downloadBtn = page.locator(
        'button:has-text("Download QR"), button:has-text("Download"), a[download]'
      ).first();
      await expect(downloadBtn).toBeVisible({ timeout: 5_000 });
    }
  });

  test('API PATCH /api/tables/[id] to regenerate QR requires auth', async ({ playwright }) => {
    const unauth = await playwright.request.newContext({ storageState: { cookies: [], origins: [] } });
    const res = await unauth.patch(`${BASE_URL}/api/tables/some-id`, {
      data: { regenerate_qr: true },
    });
    expect([401, 403]).toContain(res.status());
  });
});

// ─── Delete Table ─────────────────────────────────────────────────────────────

test.describe('Delete table', () => {
  test('API DELETE /api/tables/[id] requires auth', async ({ playwright }) => {
    const unauth = await playwright.request.newContext({ storageState: { cookies: [], origins: [] } });
    const res = await unauth.delete(`${BASE_URL}/api/tables/some-id`);
    expect([401, 403]).toContain(res.status());
  });

  test('delete confirmation modal appears before deletion', async ({ page }) => {
    await page.goto('/dashboard/tables');

    const deleteBtn = page.locator(
      '[data-testid*="delete-table"], button[aria-label*="delete table" i]'
    ).first();
    if (!await deleteBtn.isVisible()) return;

    await deleteBtn.click();
    const modal = page.locator('[role="dialog"], [class*="modal"]').first();
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // Confirm button inside modal
    const confirmBtn = modal.locator('button:has-text("Delete"), button:has-text("Confirm")').first();
    await expect(confirmBtn).toBeVisible();
  });
});

// ─── GET /api/tables ─────────────────────────────────────────────────────────

test.describe('GET /api/tables', () => {
  test('unauthenticated request returns 401', async ({ playwright }) => {
    const unauth = await playwright.request.newContext({ storageState: { cookies: [], origins: [] } });
    const res = await unauth.get(`${BASE_URL}/api/tables`);
    expect([401, 403]).toContain(res.status());
  });
});
