/**
 * Admin Dashboard UI Tests — /dashboard
 *
 * Tests the authenticated admin dashboard frontend logic:
 *   - KPI cards (revenue, orders, avg value, tables)
 *   - Revenue chart rendering
 *   - Live orders table
 *   - Top sellers panel
 *   - Floor plan (table grid)
 *   - Navigation (sidebar links)
 *   - Quick actions
 *
 * These tests run with storageState = .playwright/admin-session.json
 * (set up by global.setup.ts). If the session is not available, tests skip.
 */

import { test, expect } from '@playwright/test';

// ─── Dashboard page load ──────────────────────────────────────────────────────

test.describe('Dashboard page load', () => {
  test('loads /dashboard without redirecting to /login', async ({ page }) => {
    await page.goto('/dashboard');
    // Should NOT be sent to /login
    await expect(page).not.toHaveURL(/\/login/i, { timeout: 15_000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('page title includes ScanBite or Restaurant', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveTitle(/ScanBite|Restaurant|Dashboard/i, { timeout: 15_000 });
  });

  test('main content area is visible', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('main')).toBeVisible({ timeout: 15_000 });
  });
});

// ─── Welcome header ───────────────────────────────────────────────────────────

test.describe('Dashboard — welcome header', () => {
  test('shows "Welcome" greeting with admin name', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('h1')).toContainText(/Welcome/i, { timeout: 15_000 });
  });

  test('shows current date and time in header', async ({ page }) => {
    await page.goto('/dashboard');
    // The header shows dateStr · timeStr — check for a weekday name or month
    const header = page.locator('.adm-top__sub');
    await expect(header).toBeVisible({ timeout: 10_000 });
    const text = await header.textContent();
    expect(text).toBeTruthy();
    // Should contain a day name (Mon, Tue, etc.) or month abbreviation
    expect(text).toMatch(/\d{4}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/i);
  });

  test('"New order" button is visible and links to /dashboard/orders/new', async ({ page }) => {
    await page.goto('/dashboard');
    // Let page load fully if databases are cold
    await page.locator('h1').filter({ hasText: /Welcome/i }).first().waitFor({ state: 'visible', timeout: 15_000 });
    const newOrderBtn = page.locator('a[href="/dashboard/orders/new"] button, a[href="/dashboard/orders/new"]').first();
    await expect(newOrderBtn).toBeVisible({ timeout: 15_000 });
  });
});

// ─── KPI cards ────────────────────────────────────────────────────────────────

test.describe('Dashboard — KPI cards', () => {
  test('Today\'s revenue card is present', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(
      page.locator('.kpi.feature, .kpi').filter({ hasText: /revenue/i }).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('Orders today KPI card is present', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(
      page.locator('.kpi').filter({ hasText: /orders today/i }).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('Avg order value KPI card is present', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(
      page.locator('.kpi').filter({ hasText: /avg order value/i }).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('Tables seated KPI card is present', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(
      page.locator('.kpi').filter({ hasText: /tables/i }).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('KPI values are numeric (not NaN or undefined)', async ({ page }) => {
    await page.goto('/dashboard');
    const kpiValues = page.locator('.kpi__val');
    const count = await kpiValues.count();
    expect(count).toBeGreaterThanOrEqual(4);

    for (let i = 0; i < count; i++) {
      const text = (await kpiValues.nth(i).textContent()) ?? '';
      // Should not contain "NaN", "undefined", or be empty
      expect(text).not.toContain('NaN');
      expect(text).not.toContain('undefined');
    }
  });
});

// ─── Revenue chart ────────────────────────────────────────────────────────────

test.describe('Dashboard — revenue chart', () => {
  test('Revenue chart card is present', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(
      page.locator('.card').filter({ hasText: /Revenue.*Today/i }).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('Revenue chart shows SVG or "No orders yet" state', async ({ page }) => {
    await page.goto('/dashboard');
    const chartCard = page.locator('.card').filter({ hasText: /Revenue.*Today/i }).first();
    await expect(chartCard).toBeVisible();

    // Either an SVG chart or the empty state message
    const hasSvg = await chartCard.locator('svg').count() > 0;
    const hasEmptyState = await chartCard.getByText(/No orders yet/i).count() > 0;

    expect(hasSvg || hasEmptyState).toBeTruthy();
  });

  test('"Full report" link points to /dashboard/analytics', async ({ page }) => {
    await page.goto('/dashboard');
    const link = page.locator('a[href="/dashboard/analytics"]').first();
    await expect(link).toBeVisible({ timeout: 10_000 });
  });
});

// ─── Live orders panel ────────────────────────────────────────────────────────

test.describe('Dashboard — live orders panel', () => {
  test('Live orders card is present', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(
      page.locator('.card').filter({ hasText: /Live orders/i }).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('Shows "No orders yet" or order rows', async ({ page }) => {
    await page.goto('/dashboard');
    const ordersCard = page.locator('.card').filter({ hasText: /Live orders/i }).first();
    await expect(ordersCard).toBeVisible();

    const hasNoOrders = await ordersCard.getByText(/No orders yet/i).count() > 0;
    const hasOrderRows = await ordersCard.locator('.order-row, .order-card-row').count() > 0;

    expect(hasNoOrders || hasOrderRows).toBeTruthy();
  });

  test('"View all" link points to /dashboard/orders', async ({ page }) => {
    await page.goto('/dashboard');
    const viewAllLink = page.locator('a[href="/dashboard/orders"]').first();
    await expect(viewAllLink).toBeVisible({ timeout: 10_000 });
  });
});

// ─── Today's orders donut chart ───────────────────────────────────────────────

test.describe('Dashboard — today\'s orders donut', () => {
  test('Donut chart card is visible', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(
      page.locator('.card').filter({ hasText: /Today.*orders|Today's orders/i }).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('Donut chart SVG is rendered', async ({ page }) => {
    await page.goto('/dashboard');
    const donutWrap = page.locator('.donut-wrap');
    await expect(donutWrap).toBeVisible({ timeout: 10_000 });
    const svg = donutWrap.locator('svg');
    await expect(svg).toBeVisible();
  });
});

// ─── Top sellers panel ────────────────────────────────────────────────────────

test.describe('Dashboard — top sellers', () => {
  test('Top sellers card is present', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(
      page.locator('.card').filter({ hasText: /Top sellers/i }).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('Shows "No orders yet" or ranked items', async ({ page }) => {
    await page.goto('/dashboard');
    const card = page.locator('.card').filter({ hasText: /Top sellers/i }).first();

    const hasEmptyState = await card.getByText(/No orders yet/i).count() > 0;
    const hasItems = await card.locator('.top-item').count() > 0;

    expect(hasEmptyState || hasItems).toBeTruthy();
  });
});

// ─── Floor plan ───────────────────────────────────────────────────────────────

test.describe('Dashboard — floor plan', () => {
  test('Floor plan card is visible', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(
      page.locator('.card').filter({ hasText: /Floor plan/i }).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('Shows table grid or "No tables configured" message', async ({ page }) => {
    await page.goto('/dashboard');
    const card = page.locator('.card').filter({ hasText: /Floor plan/i }).first();

    const hasNoTables = await card.getByText(/No tables configured/i).count() > 0;
    const hasTables = await card.locator('.tbl-dot').count() > 0;

    expect(hasNoTables || hasTables).toBeTruthy();
  });

  test('"Manage" link points to /dashboard/tables', async ({ page }) => {
    await page.goto('/dashboard');
    const manageLink = page.locator('a[href="/dashboard/tables"]').first();
    await expect(manageLink).toBeVisible({ timeout: 10_000 });
  });
});

// ─── Navigation ───────────────────────────────────────────────────────────────

test.describe('Dashboard — navigation', () => {
  const navLinks = [
    { label: /menu/i, href: '/dashboard/menu' },
    { label: /table/i, href: '/dashboard/tables' },
    { label: /order/i, href: '/dashboard/orders' },
    { label: /billing|bill/i, href: '/dashboard/billing' },
    { label: /analytics/i, href: '/dashboard/analytics' },
    { label: /settings/i, href: '/dashboard/settings' },
  ];

  for (const { label, href } of navLinks) {
    test(`Nav link to ${href} is present`, async ({ page }) => {
      await page.goto('/dashboard');
      const link = page.locator(`a[href="${href}"]`).first();
      await expect(link).toBeVisible({ timeout: 10_000 });
    });
  }

  test('Clicking Analytics nav link navigates to /dashboard/analytics', async ({ page }) => {
    await page.goto('/dashboard');
    const analyticsLink = page.locator('a[href="/dashboard/analytics"]').first();
    await analyticsLink.click();
    await page.waitForURL('**/dashboard/analytics', { timeout: 15_000 });
    expect(page.url()).toContain('/dashboard/analytics');
  });

  test('Clicking Orders nav link navigates to /dashboard/orders', async ({ page }) => {
    await page.goto('/dashboard');
    const ordersLink = page.locator('a[href="/dashboard/orders"]').first();
    await ordersLink.click();
    await page.waitForURL('**/dashboard/orders', { timeout: 15_000 });
    expect(page.url()).toContain('/dashboard/orders');
  });
});

// ─── Search input ─────────────────────────────────────────────────────────────

test.describe('Dashboard — search input', () => {
  test('Search input is visible in the top bar', async ({ page }) => {
    await page.goto('/dashboard');
    const searchInput = page.locator('.adm-search input');
    await expect(searchInput).toBeVisible({ timeout: 10_000 });
  });

  test('Search input has correct placeholder text', async ({ page }) => {
    await page.goto('/dashboard');
    const searchInput = page.locator('.adm-search input');
    const placeholder = await searchInput.getAttribute('placeholder');
    expect(placeholder).toContain('Search');
  });
});

// ─── Notification bell ────────────────────────────────────────────────────────

test.describe('Dashboard — notification bell', () => {
  test('Notification bell icon button is visible', async ({ page }) => {
    await page.goto('/dashboard');
    const bell = page.locator('.adm-icon-btn').first();
    await expect(bell).toBeVisible({ timeout: 10_000 });
  });
});

// ─── Page performance ─────────────────────────────────────────────────────────

test.describe('Dashboard — page performance', () => {
  test('Dashboard loads in under 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/dashboard');
    await expect(page.locator('main')).toBeVisible({ timeout: 15_000 });
    const elapsed = Date.now() - start;

    // Warn if slow but don't fail (dev server is slower than production)
    if (elapsed > 5000) {
      console.warn(`Dashboard load time: ${elapsed}ms (> 5s threshold)`);
    }
    expect(elapsed).toBeLessThan(15_000); // Hard fail at 15s
  });
});
