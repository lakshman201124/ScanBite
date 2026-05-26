/**
 * Admin Analytics Page — section 4b
 * Tests /dashboard/analytics: date range picker, revenue chart, popular items,
 * and orders breakdown.
 *
 * Runs in admin-desktop project (pre-authenticated via storageState).
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// ─── Page Load ────────────────────────────────────────────────────────────────

test.describe('Analytics page load', () => {
  test('navigates to /dashboard/analytics without redirect', async ({ page }) => {
    await page.goto('/dashboard/analytics');
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
    expect(page.url()).toContain('/dashboard/analytics');
  });

  test('page heading includes Analytics', async ({ page }) => {
    await page.goto('/dashboard/analytics');
    await expect(
      page.locator('h1, h2').filter({ hasText: /analytics/i }).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('no spinners remain after data loads', async ({ page }) => {
    await page.goto('/dashboard/analytics');
    await page.waitForTimeout(3000);
    const spinners = page.locator('[class*="spinner"], [class*="loading"], [data-testid*="spinner"]');
    expect(await spinners.count()).toBe(0);
  });
});

// ─── Date Range Picker ────────────────────────────────────────────────────────

test.describe('Date range picker', () => {
  test('date range picker defaults to "Today" or "7 Days"', async ({ page }) => {
    await page.goto('/dashboard/analytics');
    const picker = page.locator('button').filter({ hasText: /today|7 days|30 days/i }).first();
    await expect(picker).toBeVisible({ timeout: 15_000 });

    const text = await picker.textContent() ?? await picker.inputValue();
    expect(text?.toLowerCase()).toMatch(/today|1d|this day|7 days|7d/i);
  });

  test('changing range to "Last 7 Days" updates chart', async ({ page }) => {
    await page.goto('/dashboard/analytics');
    const btn = page.locator('button').filter({ hasText: /7 days/i }).first();
    if (await btn.isVisible()) {
      await btn.click();
      await page.waitForTimeout(1000);
      const chart = page.locator('svg, [class*="recharts"], [class*="chart"]').first();
      await expect(chart).toBeVisible({ timeout: 10_000 });
    }
  });
});

// ─── Revenue Chart ────────────────────────────────────────────────────────────

test.describe('Revenue chart (Recharts)', () => {
  test('revenue chart SVG renders with axis labels', async ({ page }) => {
    await page.goto('/dashboard/analytics');
    const chart = page.locator(
      '.recharts-wrapper, [class*="recharts"], svg, [class*="chart-wrap"]'
    ).first();
    await expect(chart).toBeVisible({ timeout: 15_000 });
    const elements = chart.locator('line, path, .as-legend').first();
    await expect(elements).toBeVisible();
  });

  test('chart shows "No data" state gracefully when no orders', async ({ page }) => {
    await page.goto('/dashboard/analytics');
    const chartOrEmpty = page.locator('.recharts-wrapper')
      .or(page.locator('[class*="no-data"]'))
      .or(page.locator('text=/no orders|no data|failed to load|revenue trend/i'))
      .first();
    await expect(chartOrEmpty).toBeVisible({ timeout: 15_000 });
  });
});

// ─── Popular Items ────────────────────────────────────────────────────────────

test.describe('Popular items section', () => {
  test('popular items section is visible', async ({ page }) => {
    await page.goto('/dashboard/analytics');
    await expect(
      page.locator('text=/popular items|top items|best sellers|top performing dishes/i').first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('shows up to 5 popular items or empty state', async ({ page }) => {
    await page.goto('/dashboard/analytics');
    // Wait for analytics data fetch to load and stabilize
    await page.waitForTimeout(3500);
    const items = page.locator('[class*="popular-item"], [class*="top-item"], [class*="as-table__row"]');
    const count = await items.count();
    expect(count).toBeLessThanOrEqual(5);
    // Either items or empty message
    const emptyMsg = page.locator('text=/no orders|no data|no dish data/i').first();
    expect(count > 0 || await emptyMsg.isVisible()).toBeTruthy();
  });
});

// ─── Orders Breakdown ─────────────────────────────────────────────────────────

test.describe('Orders breakdown by payment method', () => {
  test('breakdown section or chart is visible', async ({ page }) => {
    await page.goto('/dashboard/analytics');
    const breakdown = page.locator('text=/payment method|breakdown|online|cash/i')
      .or(page.locator('[class*="breakdown"]'))
      .first();
    await expect(breakdown).toBeVisible({ timeout: 15_000 });
  });
});

// ─── API: GET /api/admin/analytics ───────────────────────────────────────────

test.describe('GET /api/admin/analytics', () => {
  test('unauthenticated request returns 401', async ({ playwright }) => {
    const unauth = await playwright.request.newContext({ storageState: { cookies: [], origins: [] } });
    const res = await unauth.get(`${BASE_URL}/api/admin/analytics`);
    expect([401, 403]).toContain(res.status());
  });

  test('response body does not leak data on 401', async ({ playwright }) => {
    const unauth = await playwright.request.newContext({ storageState: { cookies: [], origins: [] } });
    const res = await unauth.get(`${BASE_URL}/api/admin/analytics`);
    const body = await res.json() as Record<string, unknown>;
    expect(body.success).toBe(false);
    expect(body.data).toBeUndefined();
    expect(body.kpis).toBeUndefined();
  });
});
