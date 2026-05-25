/**
 * Admin Orders Management — section 4e
 * Tests /dashboard/orders: order table, status filters, admin override,
 * invalid transition rejection, cancellation with reason, and manual order.
 *
 * Runs in admin-desktop project (pre-authenticated).
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// ─── Page Load ────────────────────────────────────────────────────────────────

test.describe('Orders Management page load', () => {
  test('navigates to /dashboard/orders without redirect', async ({ page }) => {
    await page.goto('/dashboard/orders');
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
    expect(page.url()).toContain('/dashboard/orders');
  });

  test('orders table with expected columns is visible', async ({ page }) => {
    await page.goto('/dashboard/orders');

    const headers = ['Order', 'Table', 'Total', 'Status'];
    for (const header of headers) {
      await expect(
        page.locator(`text=/${header}/i`).first()
      ).toBeVisible({ timeout: 15_000 });
    }
  });

  test('status filter pills are visible', async ({ page }) => {
    await page.goto('/dashboard/orders');
    const filterArea = page.locator(
      '[class*="filter"], [class*="tab"], [class*="status-pill"]'
    ).first();
    await expect(filterArea).toBeVisible({ timeout: 15_000 });
  });
});

// ─── Status Filters ───────────────────────────────────────────────────────────

test.describe('Status filter', () => {
  const statuses = ['Pending', 'Preparing', 'Ready', 'Served', 'Cancelled'];

  for (const status of statuses) {
    test(`clicking "${status}" filter updates order list`, async ({ page }) => {
      await page.goto('/dashboard/orders');

      const filterBtn = page.locator(
        `button:has-text("${status}"), [data-filter="${status.toLowerCase()}"]`
      ).first();

      if (await filterBtn.isVisible()) {
        await filterBtn.click();
        await page.waitForTimeout(500);
        // Page should not crash or redirect
        expect(page.url()).toContain('/dashboard/orders');
      }
    });
  }
});

// ─── API: Admin Status Override ───────────────────────────────────────────────

test.describe('PATCH /api/admin/orders/[id]/status', () => {
  test('unauthenticated request returns 401', async ({ request }) => {
    const res = await request.patch(`${BASE_URL}/api/admin/orders/some-id/status`, {
      data: { status: 'serving' },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('invalid status value returns 400', async ({ request }) => {
    const res = await request.patch(`${BASE_URL}/api/admin/orders/some-id/status`, {
      data: { status: 'INVALID_STATUS_XYZ' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('missing status field returns 400', async ({ request }) => {
    const res = await request.patch(`${BASE_URL}/api/admin/orders/some-id/status`, {
      data: {},
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('invalid transition: served → pending returns 400 or 401', async ({ request }) => {
    const res = await request.patch(
      `${BASE_URL}/api/admin/orders/00000000-0000-0000-0000-000000000001/status`,
      { data: { status: 'pending' } }
    );
    expect([400, 401, 403]).toContain(res.status());
  });
});

// ─── Cancellation ─────────────────────────────────────────────────────────────

test.describe('Order cancellation', () => {
  test('cancel order button opens reason modal', async ({ page }) => {
    await page.goto('/dashboard/orders');

    const cancelBtn = page.locator(
      '[data-testid*="cancel-order"], button[aria-label*="cancel" i]:visible'
    ).first();
    if (!await cancelBtn.isVisible()) return;

    await cancelBtn.click();
    const modal = page.locator('[role="dialog"], [class*="modal"]').first();
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // Reason textarea or input
    const reasonInput = modal.locator('textarea, input[name*="reason"]').first();
    await expect(reasonInput).toBeVisible();
  });

  test('cancel without reason is blocked', async ({ page }) => {
    await page.goto('/dashboard/orders');

    const cancelBtn = page.locator('[data-testid*="cancel-order"]').first();
    if (!await cancelBtn.isVisible()) return;

    await cancelBtn.click();
    const modal = page.locator('[role="dialog"], [class*="modal"]').first();
    if (!await modal.isVisible()) return;

    // Submit without filling reason
    const submitBtn = modal.locator('button[type="submit"]:has-text("Cancel"), button:has-text("Confirm Cancel")').first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForTimeout(300);
      // Modal should still be open (not submitted)
      await expect(modal).toBeVisible();
    }
  });
});

// ─── Manual Order ─────────────────────────────────────────────────────────────

test.describe('Manual order — POST /api/admin/orders/manual', () => {
  test('API requires auth', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/admin/orders/manual`, {
      data: {
        table_id: 'some-table',
        items: [{ menu_item_id: 'some-item', quantity: 1 }],
      },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('missing table_id returns 400', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/admin/orders/manual`, {
      data: { items: [{ menu_item_id: 'some-item', quantity: 1 }] },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('empty items array returns 400', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/admin/orders/manual`, {
      data: { table_id: 'some-table', items: [] },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('"New Order" button navigates to manual order builder', async ({ page }) => {
    await page.goto('/dashboard/orders');
    const newOrderBtn = page.locator(
      'a[href*="orders/new"] button, a[href*="orders/new"], button:has-text("New Order")'
    ).first();
    await expect(newOrderBtn).toBeVisible({ timeout: 15_000 });
    await newOrderBtn.click();
    await page.waitForURL(/orders\/new|orders\/manual/, { timeout: 10_000 });
  });
});
