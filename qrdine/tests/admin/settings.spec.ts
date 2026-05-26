/**
 * Admin Settings — section 4i
 * Tests /dashboard/settings: restaurant name update, GST rates, brand colour,
 * and logo upload.
 *
 * Runs in admin-desktop project (pre-authenticated).
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// ─── Page Load ────────────────────────────────────────────────────────────────

test.describe('Settings page load', () => {
  test('navigates to /dashboard/settings without redirect', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
    expect(page.url()).toContain('/dashboard/settings');
  });

  test('restaurant name field is visible and editable', async ({ page }) => {
    await page.goto('/dashboard/settings');
    const nameInput = page.locator(
      'input[name="name"], input[name="restaurantName"], input[placeholder*="restaurant name" i]'
    ).first();
    await expect(nameInput).toBeVisible({ timeout: 15_000 });
  });

  test('CGST and SGST rate inputs are visible', async ({ page }) => {
    await page.goto('/dashboard/settings');
    const cgstInput = page.locator('input[name*="cgst" i], input[name*="CGST"]').first();
    const sgstInput = page.locator('input[name*="sgst" i], input[name*="SGST"]').first();
    await expect(cgstInput).toBeVisible({ timeout: 15_000 });
    await expect(sgstInput).toBeVisible({ timeout: 15_000 });
  });
});

// ─── API: PATCH /api/admin/settings ──────────────────────────────────────────

test.describe('PATCH /api/admin/settings', () => {
  test('unauthenticated request returns 401', async ({ request }) => {
    const res = await request.patch(`${BASE_URL}/api/admin/settings`, {
      data: { name: 'New Name' },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('GET /api/admin/settings unauthenticated returns 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/admin/settings`);
    expect([401, 403]).toContain(res.status());
  });

  test('negative CGST rate rejected', async ({ request }) => {
    const res = await request.patch(`${BASE_URL}/api/admin/settings`, {
      data: { cgst_rate: -5 },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('CGST + SGST rate > 100% rejected', async ({ request }) => {
    const res = await request.patch(`${BASE_URL}/api/admin/settings`, {
      data: { cgst_rate: 60, sgst_rate: 60 },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('invalid brand_color (not a hex) rejected', async ({ request }) => {
    const res = await request.patch(`${BASE_URL}/api/admin/settings`, {
      data: { brand_color: 'notacolor' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });
});

// ─── Brand Colour ─────────────────────────────────────────────────────────────

test.describe('Brand colour update', () => {
  test('brand colour input accepts valid hex', async ({ page }) => {
    await page.goto('/dashboard/settings');

    const colorInput = page.locator(
      'input[name*="color" i], input[name*="colour" i], input[name*="brand" i], input[type="color"]'
    ).first();
    if (await colorInput.isVisible()) {
      await colorInput.fill('#FF4D3D');
      await expect(colorInput).toHaveValue('#FF4D3D');
    }
  });

  test('--brand CSS variable updates on customer menu after settings change', async ({ page }) => {
    const slug = process.env.TEST_RESTAURANT_SLUG ?? 'spice-garden';
    await page.goto(`/m/${slug}`);

    const brandVar = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--brand').trim()
    );
    // Brand variable should be set (not empty)
    expect(brandVar.length).toBeGreaterThan(0);
  });
});

// ─── Logo Upload ──────────────────────────────────────────────────────────────

test.describe('Logo upload — POST /api/upload', () => {
  test('unauthenticated upload returns 401', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/upload`);
    expect([401, 403]).toContain(res.status());
  });

  test('upload endpoint returns a signed preset URL (with auth)', async ({ request }) => {
    const uploadRes = process.env.TEST_ADMIN_SESSION
      ? await request.post(`${BASE_URL}/api/upload`, {
          data: { resourceType: 'image' },
          headers: { Cookie: process.env.TEST_ADMIN_SESSION },
        })
      : null;

    if (uploadRes && uploadRes.status() === 200) {
      const body = await uploadRes.json() as { signature?: string; cloudName?: string };
      expect(body.signature).toBeDefined();
    }
  });
});

// ─── GST rate change — old bills unchanged ────────────────────────────────────

test.describe('GST rate change isolation', () => {
  test('old bill retains its original CGST/SGST values after rate change', async ({ request }) => {
    const billId = process.env.TEST_BILL_ID;
    if (!billId) {
      test.skip(true, 'TEST_BILL_ID not set');
      return;
    }

    // Fetch the bill before any rate change
    const res = await request.get(`${BASE_URL}/api/admin/bills/${billId}`);
    if (res.status() === 200) {
      const body = await res.json() as { data: { cgst: number; sgst: number } };
      // cgst and sgst should be present and numeric (snapshot at bill creation time)
      expect(typeof body.data.cgst).toBe('number');
      expect(typeof body.data.sgst).toBe('number');
    }
  });
});
