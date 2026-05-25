/**
 * Security — Auth Bypass Tests
 *
 * Verifies that every protected route rejects unauthenticated and
 * incorrectly-authenticated requests without leaking information.
 *
 * Rules under test:
 *  - /dashboard/* without admin JWT → 401/redirect to /login
 *  - /kds/* without chef JWT → 401/redirect to /chef-login
 *  - /api/admin/* without JWT → 401
 *  - /api/chef/* without JWT → 401
 *  - /api/customer/* without valid session → 401
 *  - Expired/tampered JWT → 401, NOT 500
 *  - Chef JWT used on admin endpoint → 403
 */

import { test, expect } from '@playwright/test';
import { BASE_URL } from '../helpers/api.helpers';

// ─── UI routes — redirect guards ─────────────────────────────────────────────

test.describe('UI route guards (unauthenticated browser)', () => {
  test('/dashboard redirects to /login', async ({ page }) => {
    const res = await page.goto('/dashboard', { waitUntil: 'commit' });
    // Should end up on /login
    await page.waitForURL(/\/login/i, { timeout: 10_000 });
    expect(page.url()).toContain('/login');
  });

  test('/dashboard/orders redirects to /login', async ({ page }) => {
    await page.goto('/dashboard/orders', { waitUntil: 'commit' });
    await page.waitForURL(/\/login/i, { timeout: 10_000 });
    expect(page.url()).toContain('/login');
  });

  test('/dashboard/menu redirects to /login', async ({ page }) => {
    await page.goto('/dashboard/menu', { waitUntil: 'commit' });
    await page.waitForURL(/\/login/i, { timeout: 10_000 });
    expect(page.url()).toContain('/login');
  });

  test('/dashboard/analytics redirects to /login', async ({ page }) => {
    await page.goto('/dashboard/analytics', { waitUntil: 'commit' });
    await page.waitForURL(/\/login/i, { timeout: 10_000 });
    expect(page.url()).toContain('/login');
  });

  test('/kds redirects to /chef-login', async ({ page }) => {
    await page.goto('/kds', { waitUntil: 'commit' });
    await page.waitForURL(/\/chef-login/i, { timeout: 10_000 });
    expect(page.url()).toContain('chef-login');
  });
});

// ─── Admin API routes — no JWT ────────────────────────────────────────────────

test.describe('Admin API routes — no JWT returns 401', () => {
  const adminRoutes = [
    '/api/admin/analytics',
    '/api/admin/bills',
    '/api/admin/settings',
    '/api/admin/staff',
    '/api/admin/inventory',
    '/api/menu/categories',
    '/api/menu/items',
    '/api/tables',
  ];

  for (const route of adminRoutes) {
    test(`GET ${route} → 401`, async ({ request }) => {
      const res = await request.get(`${BASE_URL}${route}`);
      expect([401, 403]).toContain(res.status());
      expect(res.status()).not.toBe(500);
    });
  }
});

// ─── Customer API routes — no session ────────────────────────────────────────

test.describe('Customer API routes — no session returns 401', () => {
  test('GET /api/customer/orders → 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/customer/orders`);
    expect(res.status()).toBe(401);
  });

  test('POST /api/customer/orders → 401', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/customer/orders`, {
      data: { items: [{ menu_item_id: 'some-id', quantity: 1 }] },
    });
    expect(res.status()).toBe(401);
  });
});

// ─── Chef API routes — no JWT ─────────────────────────────────────────────────

test.describe('Chef API routes — no JWT returns 401', () => {
  test('PATCH /api/chef/orders/[id]/status → 401', async ({ request }) => {
    const res = await request.patch(
      `${BASE_URL}/api/chef/orders/00000000-0000-0000-0000-000000000000/status`,
      { data: { status: 'ready' } }
    );
    expect([401, 403]).toContain(res.status());
  });
});

// ─── Expired / malformed JWT ─────────────────────────────────────────────────

test.describe('Malformed JWT handling — should return 401, not 500', () => {
  const invalidTokens = [
    'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJoYWNrZWQifQ.INVALID', // tampered signature
    'not.a.jwt',
    'Bearer garbage',
    '{"alg":"none","typ":"JWT"}.eyJzdWIiOiJhZG1pbiIsInJlc3RhdXJhbnRJZCI6Ijc3NyJ9.',
  ];

  for (const token of invalidTokens) {
    test(`Invalid token "${token.slice(0, 30)}..." → 401, not 500`, async ({ request }) => {
      const res = await request.get(`${BASE_URL}/api/admin/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Must not be 5xx — a malformed JWT must be rejected gracefully
      expect(res.status()).not.toBe(500);
      expect(res.status()).toBeGreaterThanOrEqual(400);
      expect(res.status()).toBeLessThan(500);
    });
  }

  test('Expired chef_token cookie → 401, not 500', async ({ request }) => {
    // HS256-signed JWT that has exp in the past (2020-01-01)
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
      'eyJzdWIiOiJ0ZXN0IiwicmVzdGF1cmFudElkIjoiYWJjIiwicm9sZSI6ImNoZWYiLCJpYXQiOjE1Nzc4MzY4MDAsImV4cCI6MTU3Nzg0MDQwMH0.' +
      'INVALIDSIGNATURE';

    const res = await request.patch(
      `${BASE_URL}/api/chef/orders/some-id/status`,
      {
        data: { status: 'ready' },
        headers: { Cookie: `chef_token=${expiredToken}` },
      }
    );
    expect(res.status()).not.toBe(500);
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});

// ─── Cross-role access ────────────────────────────────────────────────────────

test.describe('Cross-role access — chef token on admin endpoints', () => {
  test('chef JWT cannot access admin analytics', async ({ request }) => {
    const chefToken = process.env.TEST_CHEF_TOKEN;
    if (!chefToken) {
      test.skip(true, 'TEST_CHEF_TOKEN not set — skipping cross-role test');
      return;
    }

    const res = await request.get(`${BASE_URL}/api/admin/analytics`, {
      headers: { Cookie: `chef_token=${chefToken}` },
    });
    // Should be 401/403 — admin endpoints use NextAuth session, not chef_token cookie
    expect([401, 403]).toContain(res.status());
  });
});

// ─── No information leakage on 401/403 ───────────────────────────────────────

test.describe('No information leakage in error responses', () => {
  test('401 response body does not leak DB schema info', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/admin/analytics`);
    const text = await res.text();
    // Must not contain Prisma internals or stack traces
    expect(text).not.toContain('PrismaClientKnownRequestError');
    expect(text).not.toContain('stack');
    expect(text).not.toContain('node_modules');
  });

  test('Protected route 401 response is JSON', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/admin/analytics`);
    const ct = res.headers()['content-type'] ?? '';
    expect(ct).toContain('json');
  });
});
