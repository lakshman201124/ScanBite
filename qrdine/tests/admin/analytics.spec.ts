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
  test('date range picker defaults to "Today"', async ({ page }) => {
    await page.goto('/dashboard/analytics');
    const picker = page.locator(
      '[class*="date-range"], [class*="period-picker"], select[name*="range"]'
    ).first();
    await expect(picker).toBeVisible({ timeout: 15_000 });

    const text = await picker.textContent() ?? await picker.inputValue();
    expect(text?.toLowerCase()).toMatch(/today|1d|this day/i);
  });

  test('changing range to "Last 7 Days" updates chart', async ({ page }) => {
    await page.goto('/dashboard/analytics');

    const picker = page.locator('[class*="date-range"], [class*="period-picker"]').first();
    if (!await picker.isVisible()) return;

    // Click the picker to open, then select 7-day option
    await picker.click();
    const option7d = page.locator('text=/7 days|Last 7|7D/i').first();
    if (await option7d.isVisible()) {
      await option7d.click();
      await page.waitForTimeout(1000);
      // Chart should still be visible after change
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
      '.recharts-wrapper, [class*="recharts"], svg[class*="chart"]'
    ).first();
    await expect(chart).toBeVisible({ timeout: 15_000 });

    // X-axis and Y-axis should be present inside the chart SVG
    const axes = chart.locator('.recharts-xAxis, .recharts-yAxis, [class*="axis"]');
    expect(await axes.count()).toBeGreaterThan(0);
  });

  test('chart shows "No data" state gracefully when no orders', async ({ page }) => {
    await page.goto('/dashboard/analytics');
    // Either chart OR empty state — not a crash
    const chartOrEmpty = page.locator(
      '.recharts-wrapper, [class*="no-data"], text=/no orders|no data/i'
    ).first();
    await expect(chartOrEmpty).toBeVisible({ timeout: 15_000 });
  });
});

// ─── Popular Items ────────────────────────────────────────────────────────────

test.describe('Popular items section', () => {
  test('popular items section is visible', async ({ page }) => {
    await page.goto('/dashboard/analytics');
    await expect(
      page.locator('text=/popular items|top items|best sellers/i').first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('shows up to 5 popular items or empty state', async ({ page }) => {
    await page.goto('/dashboard/analytics');
    const items = page.locator('[class*="popular-item"], [class*="top-item"]');
    const count = await items.count();
    expect(count).toBeLessThanOrEqual(5);
    // Either items or empty message
    const emptyMsg = page.locator('text=/no orders|no data/i').first();
    expect(count > 0 || await emptyMsg.isVisible()).toBeTruthy();
  });
});

// ─── Orders Breakdown ─────────────────────────────────────────────────────────

test.describe('Orders breakdown by payment method', () => {
  test('breakdown section or chart is visible', async ({ page }) => {
    await page.goto('/dashboard/analytics');
    const breakdown = page.locator(
      'text=/payment method|breakdown|online|cash/i, [class*="breakdown"]'
    ).first();
    await expect(breakdown).toBeVisible({ timeout: 15_000 });
  });
});

// ─── API: GET /api/admin/analytics ───────────────────────────────────────────

test.describe('GET /api/admin/analytics', () => {
  test('unauthenticated request returns 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/admin/analytics`);
    expect([401, 403]).toContain(res.status());
  });

  test('response body does not leak data on 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/admin/analytics`);
    const body = await res.json() as Record<string, unknown>;
    expect(body.success).toBe(false);
    expect(body.data).toBeUndefined();
    expect(body.kpis).toBeUndefined();
  });
});
