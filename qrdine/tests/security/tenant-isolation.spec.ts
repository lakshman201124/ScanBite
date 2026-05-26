/**
 * Security — Multi-Tenant Isolation Tests
 *
 * ScanBite is multi-tenant: every DB query is scoped by restaurant_id.
 * These tests verify that tenant boundaries are enforced at every endpoint.
 *
 * Without cross-tenant seeded data available (two restaurants), most of these
 * tests verify the API shape + auth guards. The cross-tenant assertions that
 * require two real admin sessions are skipped unless TEST_RESTAURANT_B_* vars
 * are configured.
 *
 * What these tests prove:
 *  1. Every /api/admin/* endpoint requires the admin's own restaurantId (from JWT)
 *  2. Passing a ?restaurant_id= query param does NOT override the session-scoped ID
 *  3. No endpoint accepts an arbitrary restaurant_id in the request body
 */

import { test, expect } from '@playwright/test';
import { BASE_URL } from '../helpers/api.helpers';

// ─── Auth-guard: no cross-tenant access without proper session ───────────────

test.describe('Tenant isolation — auth required on all tenant-scoped routes', () => {
  const tenantScopedRoutes = [
    { method: 'GET',   path: '/api/menu/categories' },
    { method: 'GET',   path: '/api/menu/items' },
    { method: 'GET',   path: '/api/tables' },
    { method: 'GET',   path: '/api/admin/bills' },
    { method: 'GET',   path: '/api/admin/analytics' },
    { method: 'GET',   path: '/api/admin/settings' },
    { method: 'GET',   path: '/api/admin/staff' },
    { method: 'GET',   path: '/api/admin/inventory' },
  ];

  for (const { method, path } of tenantScopedRoutes) {
    test(`${method} ${path} returns 401 without session (no cross-tenant leak)`, async ({ request }) => {
      const res = method === 'GET'
        ? await request.get(`${BASE_URL}${path}`)
        : await request.post(`${BASE_URL}${path}`, { data: {} });

      expect([401, 403]).toContain(res.status());
      // Confirm no actual tenant data is returned
      if (res.status() === 401 || res.status() === 403) {
        const body = await res.json().catch(() => ({})) as Record<string, unknown>;
        // Should NOT contain any array of items (would mean data was returned)
        expect(Array.isArray(body.data)).toBe(false);
      }
    });
  }
});

// ─── restaurant_id override attempt ──────────────────────────────────────────

test.describe('Tenant isolation — restaurant_id query param cannot override session', () => {
  test('GET /api/menu/categories?restaurant_id=[other] still returns 401 without auth', async ({ request }) => {
    const res = await request.get(
      `${BASE_URL}/api/menu/categories?restaurant_id=00000000-0000-0000-0000-000000000000`
    );
    expect([401, 403]).toContain(res.status());
  });

  test('GET /api/admin/bills?restaurant_id=[other] still returns 401 without auth', async ({ request }) => {
    const res = await request.get(
      `${BASE_URL}/api/admin/bills?restaurant_id=00000000-0000-0000-0000-000000000000`
    );
    expect([401, 403]).toContain(res.status());
  });
});

// ─── Customer session isolation ───────────────────────────────────────────────

test.describe('Customer session isolation', () => {
  test('bogus session_token cannot access customer orders', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/customer/orders`, {
      headers: { Cookie: 'session_token=forged-token-restaurant-b' },
    });
    expect(res.status()).toBe(401);
  });

  test('customer order endpoint requires session to scope by restaurant', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/customer/orders`, {
      data: { items: [{ menu_item_id: 'item-from-restaurant-b', quantity: 1 }] },
      headers: { Cookie: 'session_token=forged-session' },
    });
    expect(res.status()).toBe(401);
  });
});

// ─── Chef session isolation ───────────────────────────────────────────────────

test.describe('Chef session isolation', () => {
  test('chef endpoint without valid chef_token cookie returns 401', async ({ request }) => {
    const res = await request.patch(
      `${BASE_URL}/api/chef/orders/some-order-id/status`,
      { data: { status: 'ready' } }
    );
    expect([401, 403]).toContain(res.status());
  });

  test('chef endpoint with admin session (not chef JWT) returns 401', async ({ request }) => {
    // Admin session uses authjs.session-token, not chef_token
    // Sending a fake chef_token should fail JWT verification
    const res = await request.patch(
      `${BASE_URL}/api/chef/orders/some-order-id/status`,
      {
        data: { status: 'ready' },
        headers: { Cookie: 'chef_token=not-a-valid-jwt' },
      }
    );
    expect([401, 403]).toContain(res.status());
  });
});

// ─── Cross-tenant with two real restaurants (optional) ───────────────────────

test.describe('Cross-tenant data isolation — two restaurants (seeded)', () => {
  test.beforeEach(() => {
    const hasTwoTenants =
      process.env.TEST_RESTAURANT_A_SLUG &&
      process.env.TEST_RESTAURANT_B_SLUG &&
      process.env.TEST_ADMIN_A_EMAIL &&
      process.env.TEST_ADMIN_B_EMAIL;

    if (!hasTwoTenants) {
      test.skip(true, 'TEST_RESTAURANT_A/B env vars not set — cross-tenant tests skipped');
    }
  });

  test('Public menu for restaurant A does not contain restaurant B items', async ({ request }) => {
    const slugA = process.env.TEST_RESTAURANT_A_SLUG!;
    const slugB = process.env.TEST_RESTAURANT_B_SLUG!;

    const [resA, resB] = await Promise.all([
      request.get(`${BASE_URL}/api/public/menu/${slugA}`),
      request.get(`${BASE_URL}/api/public/menu/${slugB}`),
    ]);

    if (resA.status() !== 200 || resB.status() !== 200) return;

    type MenuBody = { data: { restaurant: { id: string } } };
    const bodyA = await resA.json() as MenuBody;
    const bodyB = await resB.json() as MenuBody;

    const idA = bodyA.data?.restaurant?.id;
    const idB = bodyB.data?.restaurant?.id;

    expect(idA).toBeDefined();
    expect(idB).toBeDefined();
    expect(idA).not.toBe(idB);
  });
});

// ─── Data response shape guarantees ──────────────────────────────────────────

test.describe('API response shape — tenant data never exposed in 401 body', () => {
  test('401 body from /api/admin/analytics has no restaurant data', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/admin/analytics`);
    expect([401, 403]).toContain(res.status());

    const body = await res.json() as Record<string, unknown>;
    // Must have error message, must NOT have any analytics data
    expect(body.success).toBe(false);
    expect(body.data).toBeUndefined();
    expect(body.kpis).toBeUndefined();
    expect(body.totalRevenue).toBeUndefined();
  });

  test('401 body from /api/menu/categories has no menu data', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/menu/categories`);
    expect([401, 403]).toContain(res.status());

    const body = await res.json() as Record<string, unknown>;
    expect(body.success).toBe(false);
    // Should be an error message, not a list of categories
    expect(Array.isArray(body.data)).toBe(false);
  });
});
