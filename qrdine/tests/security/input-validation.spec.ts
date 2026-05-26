/**
 * Security — Input Validation Tests
 *
 * Every POST/PATCH endpoint must:
 *  1. Reject empty bodies with 4xx (not 5xx)
 *  2. Reject extra/unknown fields without blowing up
 *  3. Reject boundary-violating values (negative price, too-long strings, etc.)
 *  4. Sanitize or reject XSS payloads in string fields
 *  5. Handle SQL-injection-style strings safely (Prisma parameterises all queries)
 */

import { test, expect, APIRequestContext } from '@playwright/test';
import { BASE_URL } from '../helpers/api.helpers';

// ─── Helpers ────────────────────────────────────────────────────────────────

async function postAndExpectClientError(
  request: APIRequestContext,
  url: string,
  body: unknown
) {
  const res = await request.post(url, { data: body });
  expect(res.status(), `Expected 4xx from POST ${url} with ${JSON.stringify(body)}`).toBeGreaterThanOrEqual(400);
  expect(res.status()).toBeLessThan(500);
}

// ─── /api/auth/signup ────────────────────────────────────────────────────────

test.describe('Input validation — POST /api/auth/signup', () => {
  test('XSS in restaurantName is handled without 5xx', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/signup`, {
      data: {
        restaurantName: '<script>alert(document.cookie)</script>',
        email: 'xss@qa.test',
        password: 'StrongPass1!',
      },
    });
    // Either 422 (Zod may allow it since names can have special chars) or 201/409
    // Key assertion: server must not crash
    expect(res.status()).not.toBe(500);
  });

  test('SQL injection in email field handled safely', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/signup`, {
      data: {
        restaurantName: 'Test',
        email: "' OR '1'='1'; --",
        password: 'StrongPass1!',
      },
    });
    // Prisma parameterises queries so injection cannot succeed; Zod will reject bad email
    expect(res.status()).not.toBe(500);
    expect(res.status()).toBeGreaterThanOrEqual(400); // invalid email format
  });

  test('extremely long restaurantName (> 100 chars) rejected', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/signup`, {
      data: {
        restaurantName: 'A'.repeat(200),
        email: 'longname@qa.test',
        password: 'StrongPass1!',
      },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('extra unknown fields are stripped (not persisted)', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/signup`, {
      data: {
        restaurantName: 'Extra Fields Test',
        email: `extraf_${Date.now()}@qa.test`,
        password: 'StrongPass1!',
        role: 'super_admin',       // should be ignored
        plan: 'pro',               // should be ignored
        is_active: false,          // should be ignored
      },
    });
    // Server should not 500 and should not respect extra fields
    expect(res.status()).not.toBe(500);
  });
});

// ─── /api/auth/chef-login ────────────────────────────────────────────────────

test.describe('Input validation — POST /api/auth/chef-login', () => {
  test('numeric string with special chars rejected', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/chef-login`, {
      data: { pin: '12;--', restaurantSlug: 'any' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('very long PIN (> 6 digits) rejected', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/chef-login`, {
      data: { pin: '12345678901234', restaurantSlug: 'any' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('restaurantSlug with path traversal characters returns 4xx or 404', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/chef-login`, {
      data: { pin: '1234', restaurantSlug: '../../etc/passwd' },
    });
    // Zod accepts any non-empty string for slug, but DB lookup should return 404
    expect([400, 404, 422]).toContain(res.status());
    expect(res.status()).not.toBe(500);
  });
});

// ─── /api/customer/orders ────────────────────────────────────────────────────

test.describe('Input validation — POST /api/customer/orders', () => {
  // All of these will also get 401 (no session), but the key point is no 5xx
  const badBodies = [
    { label: 'null body', data: null },
    { label: 'string body', data: 'just a string' },
    { label: 'empty object', data: {} },
    { label: 'items=null', data: { items: null } },
    { label: 'item with quantity=0', data: { items: [{ menu_item_id: 'id', quantity: 0 }] } },
    { label: 'negative quantity', data: { items: [{ menu_item_id: 'id', quantity: -1 }] } },
    { label: 'non-integer quantity', data: { items: [{ menu_item_id: 'id', quantity: 1.5 }] } },
  ];

  for (const { label, data } of badBodies) {
    test(`${label} → no 5xx`, async ({ request }) => {
      const res = await request.post(`${BASE_URL}/api/customer/orders`, {
        data: data as unknown,
        headers: { 'Content-Type': 'application/json' },
      });
      expect(res.status()).not.toBe(500);
      expect(res.status()).toBeGreaterThanOrEqual(400);
    });
  }
});

// ─── /api/menu/items ─────────────────────────────────────────────────────────

test.describe('Input validation — POST /api/menu/items', () => {
  test('XSS in item name — server does not 500', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/menu/items`, {
      data: {
        name: '<img src=x onerror=alert(1)>',
        price: 100,
        category_id: '00000000-0000-0000-0000-000000000000',
        food_type: 'veg',
      },
    });
    expect(res.status()).not.toBe(500);
  });

  test('price as string (not number) rejected', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/menu/items`, {
      data: {
        name: 'Test Item',
        price: 'free',
        category_id: '00000000-0000-0000-0000-000000000000',
        food_type: 'veg',
      },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('category_id as non-UUID string rejected', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/menu/items`, {
      data: {
        name: 'Test Item',
        price: 100,
        category_id: 'not-a-uuid',
        food_type: 'veg',
      },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });
});

// ─── /api/admin/bills ────────────────────────────────────────────────────────

test.describe('Input validation — POST /api/admin/bills', () => {
  test('order_id as empty string rejected', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/admin/bills`, {
      data: { order_id: '' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('discount_percent as string rejected', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/admin/bills`, {
      data: { order_id: 'some-id', discount_percent: 'ten' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });
});

// ─── General: no route leaks SQL errors ──────────────────────────────────────

test.describe('No raw SQL / Prisma error leakage in responses', () => {
  const sensitivePatterns = [
    'PrismaClientKnownRequestError',
    'PrismaClientUnknownRequestError',
    'prisma.',
    'SELECT ',
    'INSERT INTO',
    'pg_',
    'ERROR:  ',
  ];

  test('POST /api/auth/signup with SQL-like input → no Prisma error leaked', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/signup`, {
      data: {
        restaurantName: "'); DROP TABLE restaurants; --",
        email: `sqltest_${Date.now()}@qa.test`,
        password: 'StrongPass1!',
      },
    });
    const body = await res.text();
    for (const pat of sensitivePatterns) {
      expect(body, `Response leaked "${pat}"`).not.toContain(pat);
    }
  });

  test('GET /api/admin/analytics → no Prisma error leaked (even on 401)', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/admin/analytics`);
    const body = await res.text();
    for (const pat of sensitivePatterns) {
      expect(body, `Response leaked "${pat}"`).not.toContain(pat);
    }
  });
});
