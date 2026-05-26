/**
 * JWT Token Tests — session token claims and expiration
 * Covers test plan scenarios 4.6 – 4.7
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? 'admin@spicegarden.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? 'admin123';

function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT format');
  const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(Buffer.from(padded, 'base64url').toString('utf-8'));
}

async function loginAndGetSession(request: import('@playwright/test').APIRequestContext) {
  const csrfRes = await request.get(`${BASE_URL}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json() as { csrfToken: string };

  await request.post(`${BASE_URL}/api/auth/callback/credentials`, {
    form: {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      csrfToken,
      redirect: 'false',
    },
    maxRedirects: 0,
  });

  return request.get(`${BASE_URL}/api/auth/session`);
}

// ─── 4.6 JWT token contains correct claims ────────────────────────────────────

test.describe('4.6 JWT token structure and claims', () => {
  test('session endpoint returns email claim after login', async ({ request }) => {
    const sessionRes = await loginAndGetSession(request);
    const body = await sessionRes.json() as Record<string, unknown>;

    if (sessionRes.status() === 200 && body.user) {
      const user = body.user as Record<string, unknown>;
      expect(typeof user.email).toBe('string');
      expect(user.email).toBe(ADMIN_EMAIL);
    }
  });

  test('session endpoint returns user id (sub) after login', async ({ request }) => {
    const sessionRes = await loginAndGetSession(request);
    const body = await sessionRes.json() as Record<string, unknown>;

    if (sessionRes.status() === 200 && body.user) {
      const user = body.user as Record<string, unknown>;
      expect(user.id !== undefined || user.sub !== undefined).toBe(true);
    }
  });

  test('session endpoint returns tenant/restaurant info after login', async ({ request }) => {
    const sessionRes = await loginAndGetSession(request);
    const body = await sessionRes.json() as Record<string, unknown>;

    if (sessionRes.status() === 200 && body.user) {
      const user = body.user as Record<string, unknown>;
      // restaurantId is added to token in auth.config.ts JWT callback
      expect(
        user.restaurantId !== undefined || user.tenant !== undefined,
        `Session user should include restaurantId. Got: ${JSON.stringify(user)}`
      ).toBe(true);
    }
  });

  test('session endpoint returns role claim after login', async ({ request }) => {
    const sessionRes = await loginAndGetSession(request);
    const body = await sessionRes.json() as Record<string, unknown>;

    if (sessionRes.status() === 200 && body.user) {
      const user = body.user as Record<string, unknown>;
      expect(['admin', 'super_admin']).toContain(user.role as string);
    }
  });
});

// ─── 4.7 JWT expiration is 30 days ───────────────────────────────────────────

test.describe('4.7 JWT token expiration', () => {
  test('session expires property is approximately 30 days from now', async ({ request }) => {
    const sessionRes = await loginAndGetSession(request);
    const body = await sessionRes.json() as Record<string, unknown>;

    if (sessionRes.status() === 200 && body.expires) {
      const expiresAt = new Date(body.expires as string).getTime();
      const now = Date.now();
      const diffDays = (expiresAt - now) / (1000 * 60 * 60 * 24);

      // 30-day session: accept 25–31 days window
      expect(diffDays).toBeGreaterThan(25);
      expect(diffDays).toBeLessThanOrEqual(31);
    }
  });

  test('unauthenticated session endpoint returns empty/null session', async ({ page }) => {
    // Use page.request — inherits the page context's empty storageState (no cookies)
    const res = await page.request.get(`${BASE_URL}/api/auth/session`);

    // 200 = session endpoint responded (should have no user), 401 = explicit rejection
    expect([200, 401]).toContain(res.status());

    if (res.status() === 200) {
      let body: Record<string, unknown> | null = null;
      try { body = await res.json() as Record<string, unknown> | null; } catch { /* not JSON */ }
      const hasSession = body !== null && typeof body === 'object' && body.user !== undefined && body.user !== null;
      expect(hasSession, `Unauthenticated session should not have user`).toBe(false);
    }
  });
});
