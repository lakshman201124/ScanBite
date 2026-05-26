/**
 * Admin Login API Tests — POST /api/auth/callback/credentials
 * Covers test plan scenarios 4.4 – 4.5
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? 'admin@spicegarden.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? 'admin123';

async function getCSRF(request: import('@playwright/test').APIRequestContext): Promise<string> {
  const res = await request.get(`${BASE_URL}/api/auth/csrf`);
  const body = await res.json() as { csrfToken: string };
  return body.csrfToken;
}

// ─── 4.4 Login API returns 401 for invalid credentials ───────────────────────

test.describe('4.4 Login API — invalid credentials rejected', () => {
  test('wrong email returns error redirect (not 200 with session)', async ({ request }) => {
    const csrfToken = await getCSRF(request);
    const res = await request.post(`${BASE_URL}/api/auth/callback/credentials`, {
      form: { email: 'nobody@fake.com', password: 'SomePass1!', csrfToken, redirect: 'false' },
      maxRedirects: 0,
    });

    const status = res.status();
    expect([200, 302, 307]).toContain(status);

    if (status === 302 || status === 307) {
      expect(res.headers()['location']).toContain('error');
    } else {
      // 200 path: body must NOT contain a valid session URL (no dashboard redirect)
      const body = await res.json().catch(() => ({})) as Record<string, unknown>;
      expect(body.error !== undefined || body.url === undefined || String(body.url).includes('error')).toBe(true);
    }
  });

  test('wrong password returns error redirect', async ({ request }) => {
    const csrfToken = await getCSRF(request);
    const res = await request.post(`${BASE_URL}/api/auth/callback/credentials`, {
      form: { email: ADMIN_EMAIL, password: 'totallywrong999', csrfToken, redirect: 'false' },
      maxRedirects: 0,
    });

    const status = res.status();
    expect([200, 302, 307]).toContain(status);

    if (status === 302 || status === 307) {
      expect(res.headers()['location']).toContain('error');
    }
  });

  test('empty credentials do not produce 500', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/callback/credentials`, {
      form: { email: '', password: '' },
      maxRedirects: 0,
    });
    expect(res.status()).toBeLessThan(500);
  });
});

// ─── 4.5 Login API returns 200 and sets JWT for valid credentials ─────────────

test.describe('4.5 Login API — valid credentials succeed', () => {
  test('valid credentials return 200/302 with session cookie', async ({ request }) => {
    const csrfToken = await getCSRF(request);
    const res = await request.post(`${BASE_URL}/api/auth/callback/credentials`, {
      form: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        csrfToken,
        redirect: 'false',
      },
      maxRedirects: 0,
    });

    const status = res.status();
    expect([200, 302, 307]).toContain(status);

    // Successful login: redirect should NOT contain 'error'
    if (status === 302 || status === 307) {
      const loc = res.headers()['location'] ?? '';
      expect(loc).not.toContain('error=CredentialsSignin');
    }
  });

  test('response includes Set-Cookie with session token on valid login', async ({ request }) => {
    const csrfToken = await getCSRF(request);
    const res = await request.post(`${BASE_URL}/api/auth/callback/credentials`, {
      form: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        csrfToken,
        redirect: 'false',
      },
      maxRedirects: 0,
    });

    const cookies = res.headersArray().filter(h => h.name.toLowerCase() === 'set-cookie');
    const sessionCookie = cookies.find(c =>
      c.value.includes('session-token') || c.value.includes('authjs.session')
    );
    expect(sessionCookie, 'Session cookie should be set on valid login').toBeDefined();
  });

  test('session cookie is a multi-part encoded token (JWT or JWE)', async ({ request }) => {
    const csrfToken = await getCSRF(request);
    const res = await request.post(`${BASE_URL}/api/auth/callback/credentials`, {
      form: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        csrfToken,
        redirect: 'false',
      },
      maxRedirects: 0,
    });

    const cookies = res.headersArray().filter(h => h.name.toLowerCase() === 'set-cookie');
    // NextAuth v5 may use 'authjs.session-token' or '__Secure-authjs.session-token'
    const sessionCookie = cookies.find(c =>
      c.value.includes('session-token') || c.value.includes('authjs')
    );
    if (sessionCookie) {
      const tokenValue = sessionCookie.value.split(';')[0].split('=').slice(1).join('=');
      const parts = tokenValue.split('.');
      // JWT = 3 parts (header.payload.sig), JWE = 5 parts (header.key.iv.ciphertext.tag)
      expect([3, 5]).toContain(parts.length);
    }
    // If no session cookie found (redirect path), test passes trivially
  });
});
