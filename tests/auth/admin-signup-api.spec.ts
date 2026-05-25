/**
 * Admin Signup API Tests — POST /api/auth/signup
 * Covers test plan scenario 1.9
 *
 * Verifies the API contract: status codes, response shape, and DB side-effects.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

// ─── 1.9 Signup API creates tenant and admin user ────────────────────────────

test.describe('1.9 POST /api/auth/signup — DB creation', () => {
  // NOTE: The signup route requires phone OTP verification (verifyOtp(phone, otpCode)).
  // Without a real OTP code the route returns 401 "Invalid OTP".
  // These tests are marked fixme until a test-mode bypass or mock OTP is implemented.
  // Validation tests (missing fields, invalid email, weak password) still run and pass.

  test.fixme('returns 201 with restaurantId and slug (requires OTP bypass)', async ({ request }) => {
    // This test requires verifyOtp to pass. The signup flow requires:
    // 1. POST /api/auth/otp/send { phone, type: "admin_signup" }
    // 2. Intercept OTP from Twilio (not possible in automated tests without sandbox)
    // 3. POST /api/auth/signup with { ..., phone, otpCode }
    // Implement a TEST_OTP_BYPASS env flag in verifyOtp() to enable this test.
    const id = uid();
    const res = await request.post(`${BASE_URL}/api/auth/signup`, {
      data: {
        restaurantName: `API Test Cafe ${id}`,
        email: `api_${id}@testcafe.com`,
        password: 'SecurePass123',
        phone: '+919876543210',
        otpCode: process.env.TEST_OTP_CODE || '000000',
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json() as Record<string, unknown>;
    expect(body.success).toBe(true);

    const data = body.data as Record<string, unknown>;
    expect(typeof data?.restaurantId).toBe('string');
    expect((data?.restaurantId as string).length).toBeGreaterThan(0);
    expect(typeof data?.slug).toBe('string');
    expect((data?.slug as string).length).toBeGreaterThan(0);
  });

  test.fixme('slug is auto-derived from restaurant name (requires OTP bypass)', async ({ request }) => {
    const id = uid();
    const res = await request.post(`${BASE_URL}/api/auth/signup`, {
      data: {
        restaurantName: `Grand Biryani ${id}`,
        email: `biryani_${id}@test.com`,
        password: 'SecurePass123',
        phone: '+919876543210',
        otpCode: process.env.TEST_OTP_CODE || '000000',
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json() as Record<string, unknown>;
    const data = body.data as Record<string, unknown>;

    const slug = data?.slug as string;
    expect(slug).toMatch(/^[a-z0-9-]+$/);
    expect(slug).toContain('grand-biryani');
  });

  test.fixme('password is not returned in response (requires OTP bypass)', async ({ request }) => {
    const id = uid();
    const res = await request.post(`${BASE_URL}/api/auth/signup`, {
      data: {
        restaurantName: `Safe Pass ${id}`,
        email: `safepass_${id}@test.com`,
        password: 'SecurePass123',
        phone: '+919876543210',
        otpCode: process.env.TEST_OTP_CODE || '000000',
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json() as Record<string, unknown>;
    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toContain('SecurePass123');
    expect(bodyStr).not.toContain('password_hash');
  });

  test.fixme('duplicate email returns 409 with "already exists" message (requires OTP bypass)', async ({ request }) => {
    const id = uid();
    const email = `dup2_${id}@test.com`;

    await request.post(`${BASE_URL}/api/auth/signup`, {
      data: { restaurantName: `First ${id}`, email, password: 'SecurePass123', phone: '+919876543210', otpCode: process.env.TEST_OTP_CODE || '000000' },
    });

    const res = await request.post(`${BASE_URL}/api/auth/signup`, {
      data: { restaurantName: `Second ${id}`, email, password: 'SecurePass123', phone: '+919876543210', otpCode: process.env.TEST_OTP_CODE || '000000' },
    });

    expect(res.status()).toBe(409);
    const body = await res.json() as Record<string, unknown>;
    const msg = String(body.error ?? body.message ?? '').toLowerCase();
    expect(msg).toContain('already exists');
  });
});
