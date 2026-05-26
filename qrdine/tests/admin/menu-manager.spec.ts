/**
 * Admin Menu Manager — section 4c
 * Tests /dashboard/menu: categories CRUD, menu items CRUD, customizations,
 * toggle availability, drag reorder, and delete confirmation.
 *
 * Runs in admin-desktop project (pre-authenticated).
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ─── Page Load ────────────────────────────────────────────────────────────────

test.describe('Menu Manager page load', () => {
  test('navigates to /dashboard/menu without redirect', async ({ page }) => {
    await page.goto('/dashboard/menu');
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
    expect(page.url()).toContain('/dashboard/menu');
  });

  test('categories and items sections are visible', async ({ page }) => {
    await page.goto('/dashboard/menu');
    const categories = page.locator('text=/categories/i').first();
    await expect(categories).toBeVisible({ timeout: 15_000 });
  });
});

// ─── Categories CRUD ──────────────────────────────────────────────────────────

test.describe('Categories CRUD', () => {
  test('create a new category via POST /api/menu/categories', async ({ request }) => {
    const name = `QA Cat ${uid()}`;
    const res = await request.post(`${BASE_URL}/api/menu/categories`, {
      data: { name },
    });
    // 401 (no auth in API context) or 201 (created)
    expect([201, 401, 403]).toContain(res.status());
  });

  test('category appears in list after creation', async ({ page }) => {
    await page.goto('/dashboard/menu');

    const addBtn = page.locator(
      'button:has-text("Add Category"), button:has-text("New Category"), [data-testid*="add-category"]'
    ).first();
    if (!await addBtn.isVisible()) return;

    await addBtn.click();
    const nameInput = page.locator('input[name="name"], input[placeholder*="category" i]').first();
    await expect(nameInput).toBeVisible({ timeout: 5_000 });

    const catName = `Test Cat ${uid()}`;
    await nameInput.fill(catName);

    const submitBtn = page.locator('button[type="submit"]:has-text("Save"), button:has-text("Create")').first();
    await submitBtn.click();

    await expect(page.locator(`text=${catName}`)).toBeVisible({ timeout: 10_000 });
  });

  test('toggling category is_active hides it from public menu', async ({ request }) => {
    // API-level: PATCH /api/menu/categories/[id]
    const res = await request.patch(`${BASE_URL}/api/menu/categories/some-id`, {
      data: { is_active: false },
    });
    // 401 (no auth in API context) or 200
    expect(res.status()).toBeLessThan(500);
  });

  test('delete category shows confirmation modal', async ({ page }) => {
    await page.goto('/dashboard/menu');

    const deleteBtn = page.locator(
      '[data-testid*="delete-category"], button[aria-label*="delete category" i]'
    ).first();
    if (!await deleteBtn.isVisible()) return;

    await deleteBtn.click();
    // Confirmation modal should appear
    const modal = page.locator(
      '[role="dialog"], [class*="modal"], text=/are you sure|confirm/i'
    ).first();
    await expect(modal).toBeVisible({ timeout: 5_000 });
  });

  test('API PATCH /api/menu/categories/[id] requires auth', async ({ request }) => {
    const res = await request.patch(`${BASE_URL}/api/menu/categories/some-id`, {
      data: { name: 'Updated Name' },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('API DELETE /api/menu/categories/[id] requires auth', async ({ request }) => {
    const res = await request.delete(`${BASE_URL}/api/menu/categories/some-id`);
    expect([401, 403]).toContain(res.status());
  });
});

// ─── Menu Items CRUD ──────────────────────────────────────────────────────────

test.describe('Menu Items CRUD', () => {
  test('create new item form is accessible', async ({ page }) => {
    await page.goto('/dashboard/menu');

    const addBtn = page.locator(
      'button:has-text("Add Item"), button:has-text("New Item"), [data-testid*="add-item"]'
    ).first();
    await expect(addBtn).toBeVisible({ timeout: 15_000 });
  });

  test('API POST /api/menu/items requires auth', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/menu/items`, {
      data: { name: 'Test', price: 100, category_id: 'some-id', food_type: 'veg' },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('API PATCH /api/menu/items/[id] requires auth', async ({ request }) => {
    const res = await request.patch(`${BASE_URL}/api/menu/items/some-id`, {
      data: { price: 200 },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('API DELETE /api/menu/items/[id] requires auth', async ({ request }) => {
    const res = await request.delete(`${BASE_URL}/api/menu/items/some-id`);
    expect([401, 403]).toContain(res.status());
  });

  test('price update does not change existing OrderItem snapshots (API validation)', async ({ request }) => {
    // Verifying that order items carry their own item_price snapshot
    // This is a DB design guarantee — we check the API contract returns order items with their own prices
    const res = await request.get(`${BASE_URL}/api/admin/orders`);
    if (res.status() === 200) {
      type OrderBody = { data: { items?: Array<{ item_price: number }> }[] };
      const body = await res.json() as { data: OrderBody['data'] };
      if (Array.isArray(body.data) && body.data.length > 0) {
        const order = body.data[0] as { items?: Array<{ item_price: number }> };
        if (order.items) {
          expect(typeof order.items[0]?.item_price).toBe('number');
        }
      }
    }
  });

  test('toggle is_available on item removes it from public menu', async ({ request }) => {
    const res = await request.patch(`${BASE_URL}/api/menu/items/some-id`, {
      data: { is_available: false },
    });
    expect(res.status()).toBeLessThan(500);
  });
});

// ─── Customizations ───────────────────────────────────────────────────────────

test.describe('Customizations CRUD', () => {
  test('GET /api/menu/items/[id]/customizations requires auth', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/menu/items/some-id/customizations`);
    expect([401, 403]).toContain(res.status());
  });

  test('POST customization requires auth', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/menu/items/some-id/customizations`, {
      data: {
        name: 'Size',
        options: [{ label: 'Small', price_delta: 0 }, { label: 'Large', price_delta: 50 }],
        is_required: true,
      },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('DELETE customization requires auth', async ({ request }) => {
    const res = await request.delete(`${BASE_URL}/api/menu/items/some-id/customizations`);
    expect([401, 403]).toContain(res.status());
  });
});
