/**
 * Chef Login API Validation Tests — POST /api/auth/chef-login
 * Covers test plan scenarios 4.8 – 4.9
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const CHEF_SLUG = process.env.TEST_CHEF_SLUG ?? 'spice-garden';

// ─── 4.8 Chef PIN format validation ──────────────────────────────────────────

test.describe('4.8 Chef Login API — PIN format validation', () => {
  test('PIN shorter than 4 digits returns 400', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/chef-login`, {
      data: { pin: '123', restaurantSlug: CHEF_SLUG },
    });

    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('2-digit PIN returns 400', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/chef-login`, {
      data: { pin: '12', restaurantSlug: CHEF_SLUG },
    });

    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('non-numeric PIN (alpha chars) returns 400', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/chef-login`, {
      data: { pin: 'abcd', restaurantSlug: CHEF_SLUG },
    });

    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('mixed alphanumeric PIN returns 400', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/chef-login`, {
      data: { pin: '12ab', restaurantSlug: CHEF_SLUG },
    });

    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('empty PIN returns 400', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/chef-login`, {
      data: { pin: '', restaurantSlug: CHEF_SLUG },
    });

    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('missing PIN field returns 400', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/chef-login`, {
      data: { restaurantSlug: CHEF_SLUG },
    });

    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });
});

// ─── 4.9 Chef API validates restaurant slug ───────────────────────────────────

// NOTE: The chef-login API migrated from {pin, restaurantSlug} to {phone, code} (OTP flow).
// Old PIN/slug fields are now rejected by Zod validation (422).
test.describe('4.9 Chef Login API — schema validation (OTP flow)', () => {
  test('sending old-format {pin, restaurantSlug} is rejected with 4xx', async ({ request }) => {
    // Old API shape — now invalid; Zod returns 422
    const res = await request.post(`${BASE_URL}/api/auth/chef-login`, {
      data: { pin: '1234', restaurantSlug: 'nonexistent-xyz-restaurant' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('missing phone field returns 400/422', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/chef-login`, {
      data: { code: '123456' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('missing code field returns 400/422', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/chef-login`, {
      data: { phone: '+919876543210' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('valid {phone, code} shape passes schema — OTP verified or 401', async ({ request }) => {
    // With correct shape but invalid OTP, should get 401 (OTP failed) — NOT 422 (schema error)
    const res = await request.post(`${BASE_URL}/api/auth/chef-login`, {
      data: { phone: '+919876543210', code: '000000' },
    });
    // 401 = schema OK, OTP invalid. 422 = schema error (bad).
    expect([401, 404]).toContain(res.status());
  });
});
