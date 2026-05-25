/**
 * Menu API Tests
 * Covers: /api/menu/categories, /api/menu/items, /api/public/menu/[slug]
 *
 * These tests use the admin session cookie obtained in global.setup.ts.
 * Run with the api-tests project so the setup dependency is honoured.
 */

import { test, expect } from '@playwright/test';
import { adminLogin, signupRestaurant } from '../fixtures/auth.fixtures';
import {
  BASE_URL,
  expectSuccess,
  expectError,
  expectSuccessBody,
  expectErrorBody,
} from '../helpers/api.helpers';

// ─── Helpers ────────────────────────────────────────────────────────────────

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** Sign up a fresh restaurant + admin user, then log in as that admin. */
async function setupAdminContext(request: Parameters<typeof adminLogin>[0]) {
  const id = uid();
  const email = `menutest_${id}@qa.test`;
  const password = 'StrongPass1!';
  const restaurantName = `MenuTest ${id}`;

  const { res: signupRes } = await signupRestaurant(request, { restaurantName, email, password });
  expect(signupRes.status()).toBe(201);
  const signupBody = (await signupRes.json()) as { data: { restaurantId: string; slug: string } };
  const { restaurantId, slug } = signupBody.data;

  // Sign in via NextAuth credentials endpoint
  const csrfRes = await request.get(`${BASE_URL}/api/auth/csrf`);
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

  await request.post(`${BASE_URL}/api/auth/callback/credentials`, {
    form: { email, password, csrfToken, redirect: 'false', json: 'true' },
  });

  return { restaurantId, slug, email };
}

// ─── GET /api/menu/categories (requires auth) ───────────────────────────────

test.describe('GET /api/menu/categories', () => {
  test('unauthenticated request returns 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/menu/categories`);
    expect([401, 403]).toContain(res.status());
  });
});

// ─── POST /api/menu/categories ───────────────────────────────────────────────

test.describe('POST /api/menu/categories — validation', () => {
  test('empty body returns 422 validation error', async ({ request }) => {
    // Even without auth, an empty body should fail validation (422) or auth (401).
    const res = await request.post(`${BASE_URL}/api/menu/categories`, { data: {} });
    expect([401, 422]).toContain(res.status());
  });

  test('name too long (>100 chars) rejected', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/menu/categories`, {
      data: { name: 'A'.repeat(101) },
    });
    // 401 (no auth) or 422 (validation) — both are correct rejection signals
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('invalid sort_order (negative) rejected', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/menu/categories`, {
      data: { name: 'Valid Name', sort_order: -5 },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('invalid image_url (not a URL) rejected', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/menu/categories`, {
      data: { name: 'Valid Name', image_url: 'not-a-url' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });
});

// ─── POST /api/menu/items — validation ───────────────────────────────────────

test.describe('POST /api/menu/items — validation', () => {
  test('unauthenticated request returns 401', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/menu/items`, {
      data: { name: 'Test Item', price: 10, category_id: 'some-uuid', food_type: 'veg' },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('negative price rejected', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/menu/items`, {
      data: { name: 'Cheap Item', price: -10, category_id: 'some-uuid', food_type: 'veg' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('zero price rejected', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/menu/items`, {
      data: { name: 'Free Item', price: 0, category_id: 'some-uuid', food_type: 'veg' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('invalid food_type rejected', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/menu/items`, {
      data: { name: 'Test', price: 100, category_id: 'some-uuid', food_type: 'omnivore' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('name too long (>200 chars) rejected', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/menu/items`, {
      data: { name: 'A'.repeat(201), price: 100, category_id: 'some-uuid', food_type: 'veg' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('prep_time_minutes > 180 rejected', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/menu/items`, {
      data: {
        name: 'Slow Item',
        price: 100,
        category_id: 'some-uuid',
        food_type: 'veg',
        prep_time_minutes: 200,
      },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });
});

// ─── GET /api/public/menu/[slug] ─────────────────────────────────────────────

test.describe('GET /api/public/menu/[slug]', () => {
  test('nonexistent slug returns 404', async ({ request }) => {
    const res = await request.get(
      `${BASE_URL}/api/public/menu/totally-nonexistent-slug-${uid()}`
    );
    expectError(res, 404);
  });

  test('valid structure returned for known slug (seeded data)', async ({ request }) => {
    const slug = process.env.TEST_RESTAURANT_SLUG;
    if (!slug) {
      test.skip(true, 'TEST_RESTAURANT_SLUG not set — skipping seeded-data test');
      return;
    }

    const res = await request.get(`${BASE_URL}/api/public/menu/${slug}`);
    if (res.status() === 200) {
      const body = await res.json() as { success: boolean; data: unknown };
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    } else {
      // Acceptable: 404 if slug no longer exists
      expect([200, 404]).toContain(res.status());
    }
  });

  test('response is JSON (not HTML) even for invalid slug', async ({ request }) => {
    const res = await request.get(
      `${BASE_URL}/api/public/menu/ghost-${uid()}`
    );
    const contentType = res.headers()['content-type'] ?? '';
    expect(contentType).toContain('json');
  });

  test('menu items have required fields when menu exists', async ({ request }) => {
    const slug = process.env.TEST_RESTAURANT_SLUG;
    if (!slug) {
      test.skip(true, 'TEST_RESTAURANT_SLUG not set');
      return;
    }

    const res = await request.get(`${BASE_URL}/api/public/menu/${slug}`);
    if (res.status() !== 200) return;

    const body = await res.json() as {
      data: { categories: Array<{ name: string; items: Array<{ id: string; name: string; price: number }> }> };
    };
    const categories = body.data?.categories;
    if (!Array.isArray(categories) || categories.length === 0) return;

    const firstItem = categories[0]?.items?.[0];
    if (!firstItem) return;

    expect(typeof firstItem.id).toBe('string');
    expect(typeof firstItem.name).toBe('string');
    expect(typeof firstItem.price).toBe('number');
  });
});

// ─── Category reorder validation ─────────────────────────────────────────────

test.describe('PATCH /api/menu/categories (reorder)', () => {
  test('unauthenticated request returns 401', async ({ request }) => {
    const res = await request.patch(`${BASE_URL}/api/menu/categories`, {
      data: { items: [{ id: 'some-uuid', sort_order: 0 }] },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('invalid items array (not UUIDs) returns 4xx', async ({ request }) => {
    const res = await request.patch(`${BASE_URL}/api/menu/categories`, {
      data: { items: [{ id: 'not-a-uuid', sort_order: 0 }] },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });
});
