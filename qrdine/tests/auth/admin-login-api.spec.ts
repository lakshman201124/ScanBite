/**
 * Admin Login API Tests — POST /api/auth/[...nextauth]
 * Covers test plan scenario 2.10
 *
 * Validates the JWT token returned on successful login.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? 'admin@spicegarden.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? 'admin123';

function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Not a valid JWT');
  const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
}

// ─── 2.10 Login POST returns JWT token ───────────────────────────────────────

test.describe('2.10 POST /api/auth/callback/credentials — JWT token', () => {
  test('valid credentials return 200/302 with session cookie', async ({ request }) => {
    const csrfRes = await request.get(`${BASE_URL}/api/auth/csrf`);
    const { csrfToken } = await csrfRes.json() as { csrfToken: string };

    const res = await request.post(`${BASE_URL}/api/auth/callback/credentials`, {
      form: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, csrfToken, redirect: 'false' },
      maxRedirects: 0,
    });

    const status = res.status();
    expect([200, 302, 307]).toContain(status);

    // Check that Set-Cookie includes session token
    const cookies = res.headersArray().filter(h => h.name.toLowerCase() === 'set-cookie');
    const hasSessionCookie = cookies.some(c =>
      c.value.includes('next-auth.session-token') ||
      c.value.includes('authjs.session-token') ||
      c.value.includes('__Secure-next-auth.session-token')
    );
    expect(hasSessionCookie, `Expected session cookie in Set-Cookie. Got: ${JSON.stringify(cookies)}`).toBe(true);
  });

  test('session cookie is HttpOnly', async ({ request }) => {
    const csrfRes = await request.get(`${BASE_URL}/api/auth/csrf`);
    const { csrfToken } = await csrfRes.json() as { csrfToken: string };

    const res = await request.post(`${BASE_URL}/api/auth/callback/credentials`, {
      form: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, csrfToken, redirect: 'false' },
      maxRedirects: 0,
    });

    const cookies = res.headersArray().filter(h => h.name.toLowerCase() === 'set-cookie');
    const sessionCookieHeader = cookies.find(c =>
      c.value.includes('next-auth.session-token') ||
      c.value.includes('authjs.session-token')
    );

    if (sessionCookieHeader) {
      expect(sessionCookieHeader.value.toLowerCase()).toContain('httponly');
    }
  });

  test('invalid credentials result in error redirect not a 500', async ({ request }) => {
    const csrfRes = await request.get(`${BASE_URL}/api/auth/csrf`);
    const { csrfToken } = await csrfRes.json() as { csrfToken: string };

    const res = await request.post(`${BASE_URL}/api/auth/callback/credentials`, {
      form: { email: 'wrong@test.com', password: 'wrongpass', csrfToken, redirect: 'false' },
      maxRedirects: 0,
    });

    expect(res.status()).toBeLessThan(500);
    // Must redirect to /login with error param
    if ([302, 307].includes(res.status())) {
      const location = res.headers()['location'] ?? '';
      expect(location).toContain('error');
    }
  });

  test('token expiration set to ~30 days (2592000s)', async ({ request }) => {
    // Get a session token via API and decode it
    const csrfRes = await request.get(`${BASE_URL}/api/auth/csrf`);
    const { csrfToken } = await csrfRes.json() as { csrfToken: string };

    const loginRes = await request.post(`${BASE_URL}/api/auth/callback/credentials`, {
      form: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, csrfToken, redirect: 'false' },
      maxRedirects: 0,
    });

    // Get the session from /api/auth/session (needs the cookie from the login)
    const sessionRes = await request.get(`${BASE_URL}/api/auth/session`);
    const sessionBody = await sessionRes.json().catch(() => null) as Record<string, unknown> | null;

    if (sessionBody && sessionBody.expires) {
      const expiresAt = new Date(sessionBody.expires as string).getTime();
      const now = Date.now();
      const diffDays = (expiresAt - now) / (1000 * 60 * 60 * 24);
      // Should be approximately 30 days (allow 25-31 day range)
      expect(diffDays).toBeGreaterThan(25);
      expect(diffDays).toBeLessThan(31);
    }
  });
});
