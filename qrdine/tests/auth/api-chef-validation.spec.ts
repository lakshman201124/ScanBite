/**
 * Staff Login API — PIN and schema validation
 * Covers test plan scenarios 4.8 – 4.9 (updated from OTP to setup-code PIN flow)
 *
 * POST /api/auth/staff/login  { restaurantId, userId, pin }
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

const VALID_UUID_RESTAURANT = '00000000-0000-0000-0000-000000000000';
const VALID_UUID_USER       = '00000000-0000-0000-0000-000000000001';

// ─── 4.8 PIN format validation ───────────────────────────────────────────────

test.describe('4.8 Staff Login API — PIN format validation', () => {
  test('PIN shorter than 6 digits returns 400', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/staff/login`, {
      data: { restaurantId: VALID_UUID_RESTAURANT, userId: VALID_UUID_USER, pin: '12345' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.success).toBe(false);
  });

  test('2-digit PIN returns 400', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/staff/login`, {
      data: { restaurantId: VALID_UUID_RESTAURANT, userId: VALID_UUID_USER, pin: '12' },
    });
    expect(res.status()).toBe(400);
  });

  test('non-numeric PIN returns 400', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/staff/login`, {
      data: { restaurantId: VALID_UUID_RESTAURANT, userId: VALID_UUID_USER, pin: 'abcdef' },
    });
    expect(res.status()).toBe(400);
  });

  test('mixed alphanumeric PIN returns 400', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/staff/login`, {
      data: { restaurantId: VALID_UUID_RESTAURANT, userId: VALID_UUID_USER, pin: '12ab56' },
    });
    expect(res.status()).toBe(400);
  });

  test('empty PIN returns 400', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/staff/login`, {
      data: { restaurantId: VALID_UUID_RESTAURANT, userId: VALID_UUID_USER, pin: '' },
    });
    expect(res.status()).toBe(400);
  });

  test('missing PIN field returns 400', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/staff/login`, {
      data: { restaurantId: VALID_UUID_RESTAURANT, userId: VALID_UUID_USER },
    });
    expect(res.status()).toBe(400);
  });
});

// ─── 4.9 Restaurant ID + User ID schema validation ───────────────────────────

test.describe('4.9 Staff Login API — schema validation', () => {
  test('old {pin, restaurantSlug} shape rejected with 400 (schema changed)', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/staff/login`, {
      data: { pin: '123456', restaurantSlug: 'spice-garden' },
    });
    expect(res.status()).toBe(400);
  });

  test('missing restaurantId returns 400', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/staff/login`, {
      data: { userId: VALID_UUID_USER, pin: '123456' },
    });
    expect(res.status()).toBe(400);
  });

  test('missing userId returns 400', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/staff/login`, {
      data: { restaurantId: VALID_UUID_RESTAURANT, pin: '123456' },
    });
    expect(res.status()).toBe(400);
  });

  test('non-UUID restaurantId returns 400', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/staff/login`, {
      data: { restaurantId: 'spice-garden', userId: VALID_UUID_USER, pin: '123456' },
    });
    expect(res.status()).toBe(400);
  });

  test('non-UUID userId returns 400', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/staff/login`, {
      data: { restaurantId: VALID_UUID_RESTAURANT, userId: 'chef-1', pin: '123456' },
    });
    expect(res.status()).toBe(400);
  });

  test('valid schema with unknown user returns 401 or 429 — NOT 404 (no user enumeration)', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/staff/login`, {
      data: { restaurantId: VALID_UUID_RESTAURANT, userId: VALID_UUID_USER, pin: '123456' },
    });
    // Schema passes (400 not expected), auth fails → 401 or locked out → 429
    expect([401, 423, 429]).toContain(res.status());
  });

  test('6-digit numeric PIN is the minimum valid format', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/staff/login`, {
      data: { restaurantId: VALID_UUID_RESTAURANT, userId: VALID_UUID_USER, pin: '000000' },
    });
    // Schema is valid → should NOT be 400; will be 401 (wrong PIN) or 429 (rate limited)
    expect([401, 423, 429]).toContain(res.status());
  });
});
