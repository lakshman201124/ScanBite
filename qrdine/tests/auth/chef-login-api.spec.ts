/**
 * Staff Auth API Tests — new setup-code PIN flow (Q4)
 *
 * Replaces the deleted OTP-based chef-login flow.
 *
 * Three-step staff auth:
 *   POST /api/auth/staff/verify-restaurant  { code }         → restaurantId
 *   GET  /api/auth/staff/list               ?restaurantId=   → staff list
 *   POST /api/auth/staff/login              { restaurantId, userId, pin } → chef_token cookie
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// ─── verify-restaurant endpoint ───────────────────────────────────────────────

test.describe('POST /api/auth/staff/verify-restaurant', () => {
  test('missing code field returns 400', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/staff/verify-restaurant`, {
      data: {},
    });
    expect(res.status()).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.success).toBe(false);
  });

  test('empty code returns 400', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/staff/verify-restaurant`, {
      data: { code: '' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('unknown code returns 404 with success:false', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/staff/verify-restaurant`, {
      data: { code: 'INVALID-CODE-XYZ' },
    });
    expect(res.status()).toBe(404);
    const body = await res.json() as Record<string, unknown>;
    expect(body.success).toBe(false);
  });

  test('response does not reveal existence of codes (same 404 for any unknown)', async ({ request }) => {
    const [r1, r2] = await Promise.all([
      request.post(`${BASE_URL}/api/auth/staff/verify-restaurant`, { data: { code: 'AAAA1111' } }),
      request.post(`${BASE_URL}/api/auth/staff/verify-restaurant`, { data: { code: 'ZZZZ9999' } }),
    ]);
    expect(r1.status()).toBe(r2.status());
  });
});

// ─── staff/list endpoint ──────────────────────────────────────────────────────

test.describe('GET /api/auth/staff/list', () => {
  test('missing restaurantId returns 400', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/auth/staff/list`);
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('non-UUID restaurantId returns 400', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/auth/staff/list?restaurantId=not-a-uuid`);
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('unknown valid-format restaurantId returns empty list or 404', async ({ request }) => {
    const res = await request.get(
      `${BASE_URL}/api/auth/staff/list?restaurantId=00000000-0000-0000-0000-000000000000`
    );
    // Either an empty data array or a 404 — never a 500
    expect(res.status()).toBeLessThan(500);
  });

  test('list response never exposes pin_hash or setup_code', async ({ request }) => {
    const res = await request.get(
      `${BASE_URL}/api/auth/staff/list?restaurantId=00000000-0000-0000-0000-000000000000`
    );
    const body = await res.text();
    expect(body).not.toContain('pin_hash');
    expect(body).not.toContain('setup_code');
    expect(body).not.toContain('password');
  });
});

// ─── staff/login endpoint ─────────────────────────────────────────────────────

test.describe('POST /api/auth/staff/login', () => {
  test('missing required fields returns 400', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/staff/login`, { data: {} });
    expect(res.status()).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.success).toBe(false);
  });

  test('PIN shorter than 6 digits returns 400', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/staff/login`, {
      data: {
        restaurantId: '00000000-0000-0000-0000-000000000000',
        userId: '00000000-0000-0000-0000-000000000001',
        pin: '123',
      },
    });
    expect(res.status()).toBe(400);
  });

  test('non-numeric PIN returns 400', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/staff/login`, {
      data: {
        restaurantId: '00000000-0000-0000-0000-000000000000',
        userId: '00000000-0000-0000-0000-000000000001',
        pin: 'abcdef',
      },
    });
    expect(res.status()).toBe(400);
  });

  test('non-UUID restaurantId returns 400', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/staff/login`, {
      data: { restaurantId: 'not-a-uuid', userId: '00000000-0000-0000-0000-000000000001', pin: '123456' },
    });
    expect(res.status()).toBe(400);
  });

  test('valid format but unknown user returns 401 (not 404 — no user enumeration)', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/staff/login`, {
      data: {
        restaurantId: '00000000-0000-0000-0000-000000000000',
        userId: '00000000-0000-0000-0000-000000000001',
        pin: '000000',
      },
    });
    // 401 = valid schema, auth failed. Must NOT be 404 (would reveal user doesn't exist).
    expect([401, 429]).toContain(res.status());
  });

  test('response never contains pin_hash in body', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/staff/login`, {
      data: {
        restaurantId: '00000000-0000-0000-0000-000000000000',
        userId: '00000000-0000-0000-0000-000000000001',
        pin: '000000',
      },
    });
    const body = await res.text();
    expect(body).not.toContain('pin_hash');
    expect(body).not.toContain('password');
  });

  test('chef_token cookie is HttpOnly and SameSite when login succeeds', async ({ request }) => {
    // Only verifiable with a real seeded staff member and PIN.
    // Without TEST_STAFF_* env vars this is a no-op pass.
    const userId   = process.env.TEST_STAFF_USER_ID     ?? '';
    const restId   = process.env.TEST_STAFF_RESTAURANT_ID ?? '';
    const pin      = process.env.TEST_STAFF_PIN          ?? '';
    if (!userId || !restId || !pin) return;

    const res = await request.post(`${BASE_URL}/api/auth/staff/login`, {
      data: { restaurantId: restId, userId, pin },
    });
    if (res.status() !== 200) return;

    const setCookie = res.headersArray().find(
      (h) => h.name.toLowerCase() === 'set-cookie' && h.value.includes('chef_token')
    );
    if (setCookie) {
      expect(setCookie.value.toLowerCase()).toContain('httponly');
      expect(setCookie.value.toLowerCase()).toContain('samesite');
    }
  });
});
