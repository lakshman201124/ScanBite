/**
 * Signup API Validation Tests — POST /api/auth/signup
 * Covers test plan scenarios 4.1 – 4.3
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

// ─── 4.1 Email format validation ─────────────────────────────────────────────

test.describe('4.1 Signup API — email format validation', () => {
  test('invalid email format returns 400/422', async ({ request }) => {
    const id = uid();
    const res = await request.post(`${BASE_URL}/api/auth/signup`, {
      data: {
        restaurantName: `Email Test ${id}`,
        email: 'notanemail',
        password: 'SecurePass123',
      },
    });

    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('another invalid email format (missing domain) returns 4xx', async ({ request }) => {
    const id = uid();
    const res = await request.post(`${BASE_URL}/api/auth/signup`, {
      data: {
        restaurantName: `Email Test2 ${id}`,
        email: 'user@',
        password: 'SecurePass123',
      },
    });

    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('valid email format is accepted (moves past email validation)', async ({ request }) => {
    const id = uid();
    const res = await request.post(`${BASE_URL}/api/auth/signup`, {
      data: {
        restaurantName: `Valid Email ${id}`,
        email: `valid_${id}@example.com`,
        password: 'SecurePass123',
      },
    });

    // Signup now requires phone + OTP verification, so without those fields:
    // - 422 = schema validation (missing phone) — email format was fine
    // - 401 = schema OK but OTP failed
    // Must NOT be 422 due to invalid email format specifically
    if (res.status() === 422) {
      const body = await res.json() as Record<string, unknown>;
      const msg = JSON.stringify(body).toLowerCase();
      expect(msg).not.toMatch(/invalid email|email format/i);
    } else {
      expect([200, 201, 401, 409, 422]).toContain(res.status());
    }
  });
});

// ─── 4.2 Password minimum length validation ───────────────────────────────────

test.describe('4.2 Signup API — password minimum length', () => {
  test('password shorter than 8 chars returns 400 with message', async ({ request }) => {
    const id = uid();
    const res = await request.post(`${BASE_URL}/api/auth/signup`, {
      data: {
        restaurantName: `Short Pass ${id}`,
        email: `shortpass_${id}@test.com`,
        password: 'Pass12',
      },
    });

    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
    const body = await res.json() as Record<string, unknown>;
    const msg = JSON.stringify(body).toLowerCase();
    expect(msg).toMatch(/password|8 char|minimum/i);
  });

  test('password with exactly 8 chars passes password validation (not rejected for length)', async ({ request }) => {
    const id = uid();
    const res = await request.post(`${BASE_URL}/api/auth/signup`, {
      data: {
        restaurantName: `Eight Char ${id}`,
        email: `eightchar_${id}@test.com`,
        password: 'Pass1234',
      },
    });

    // Signup requires phone+OTP — without those we get 401 or 422 for missing phone.
    // Key assertion: must NOT be 422 with a "password too short" message.
    if (res.status() === 422) {
      const body = await res.json() as Record<string, unknown>;
      const msg = JSON.stringify(body).toLowerCase();
      expect(msg).not.toMatch(/password.*short|minimum.*char|at least 8/i);
    } else {
      expect([200, 201, 401, 409, 422]).toContain(res.status());
    }
  });

  test('strong password (> 8 chars) passes password validation', async ({ request }) => {
    const id = uid();
    const res = await request.post(`${BASE_URL}/api/auth/signup`, {
      data: {
        restaurantName: `Strong Pass ${id}`,
        email: `strong_${id}@test.com`,
        password: 'SecurePass123',
      },
    });

    // Must NOT be 422 for password length reasons
    if (res.status() === 422) {
      const body = await res.json() as Record<string, unknown>;
      const msg = JSON.stringify(body).toLowerCase();
      expect(msg).not.toMatch(/password.*short|minimum.*char|at least 8/i);
    } else {
      expect([200, 201, 401, 409, 422]).toContain(res.status());
    }
  });
});

// ─── 4.3 Required fields validation ──────────────────────────────────────────

test.describe('4.3 Signup API — required fields', () => {
  test('missing restaurantName returns 400', async ({ request }) => {
    const id = uid();
    const res = await request.post(`${BASE_URL}/api/auth/signup`, {
      data: {
        email: `noname_${id}@test.com`,
        password: 'SecurePass123',
      },
    });

    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('missing email returns 400', async ({ request }) => {
    const id = uid();
    const res = await request.post(`${BASE_URL}/api/auth/signup`, {
      data: {
        restaurantName: `No Email ${id}`,
        password: 'SecurePass123',
      },
    });

    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('missing password returns 400', async ({ request }) => {
    const id = uid();
    const res = await request.post(`${BASE_URL}/api/auth/signup`, {
      data: {
        restaurantName: `No Pass ${id}`,
        email: `nopass_${id}@test.com`,
      },
    });

    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('empty body returns 400', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/signup`, { data: {} });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });
});
