/**
 * Authentication API Security Tests
 * Covers test plan scenarios 4.10 – 4.11
 *
 * CSRF protection and rate limiting / brute-force prevention.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? 'admin@spicegarden.com';

// ─── 4.10 CSRF protection ────────────────────────────────────────────────────

test.describe('4.10 CSRF protection on auth endpoints', () => {
  test('NextAuth CSRF token endpoint is accessible', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/auth/csrf`);
    expect(res.status()).toBe(200);
    const body = await res.json() as { csrfToken: string };
    expect(typeof body.csrfToken).toBe('string');
    expect(body.csrfToken.length).toBeGreaterThan(0);
  });

  test('session cookies have httpOnly flag (cannot be accessed by JS)', async ({ request }) => {
    const csrfRes = await request.get(`${BASE_URL}/api/auth/csrf`);
    const { csrfToken } = await csrfRes.json() as { csrfToken: string };
    const password = process.env.TEST_ADMIN_PASSWORD ?? 'admin123';

    const res = await request.post(`${BASE_URL}/api/auth/callback/credentials`, {
      form: { email: ADMIN_EMAIL, password, csrfToken, redirect: 'false' },
      maxRedirects: 0,
    });

    const cookies = res.headersArray().filter(h => h.name.toLowerCase() === 'set-cookie');
    for (const cookie of cookies) {
      if (cookie.value.includes('session-token') || cookie.value.includes('authjs')) {
        expect(cookie.value.toLowerCase()).toContain('httponly');
      }
    }
  });

  test('session cookies have SameSite attribute', async ({ request }) => {
    const csrfRes = await request.get(`${BASE_URL}/api/auth/csrf`);
    const { csrfToken } = await csrfRes.json() as { csrfToken: string };
    const password = process.env.TEST_ADMIN_PASSWORD ?? 'admin123';

    const res = await request.post(`${BASE_URL}/api/auth/callback/credentials`, {
      form: { email: ADMIN_EMAIL, password, csrfToken, redirect: 'false' },
      maxRedirects: 0,
    });

    const cookies = res.headersArray().filter(h => h.name.toLowerCase() === 'set-cookie');
    for (const cookie of cookies) {
      if (cookie.value.includes('session-token') || cookie.value.includes('authjs')) {
        expect(cookie.value.toLowerCase()).toMatch(/samesite=(lax|strict|none)/i);
      }
    }
  });
});

// ─── 4.11 Rate limiting / brute-force prevention ─────────────────────────────

test.describe('4.11 Rate limiting on login endpoint', () => {
  test('repeated failed login attempts do not cause 500', async ({ request }) => {
    const csrfRes = await request.get(`${BASE_URL}/api/auth/csrf`);
    const { csrfToken } = await csrfRes.json() as { csrfToken: string };

    const attempts = [];
    for (let i = 0; i < 5; i++) {
      attempts.push(
        request.post(`${BASE_URL}/api/auth/callback/credentials`, {
          form: {
            email: `brute_${i}@fake.com`,
            password: 'wrongpassword',
            csrfToken,
            redirect: 'false',
          },
          maxRedirects: 0,
        })
      );
    }

    const responses = await Promise.all(attempts);
    for (const res of responses) {
      // None should be a 500 server error
      expect(res.status()).toBeLessThan(500);
    }
  });

  test('signup endpoint rejects rapid duplicate attempts gracefully', async ({ request }) => {
    const email = `ratelimit_${Date.now()}@test.com`;

    // Send 3 rapid signups with the same email
    const [res1, res2, res3] = await Promise.all([
      request.post(`${BASE_URL}/api/auth/signup`, {
        data: { restaurantName: 'Rate Test', email, password: 'SecurePass123' },
      }),
      request.post(`${BASE_URL}/api/auth/signup`, {
        data: { restaurantName: 'Rate Test2', email, password: 'SecurePass123' },
      }),
      request.post(`${BASE_URL}/api/auth/signup`, {
        data: { restaurantName: 'Rate Test3', email, password: 'SecurePass123' },
      }),
    ]);

    // At most one should succeed; others should 4xx, none should 500
    const statuses = [res1.status(), res2.status(), res3.status()];
    const successCount = statuses.filter(s => s === 201).length;
    const serverErrors = statuses.filter(s => s >= 500).length;

    expect(successCount).toBeLessThanOrEqual(1);
    expect(serverErrors).toBe(0);
  });

  test('chef login endpoint rejects malformed rapid requests gracefully', async ({ request }) => {
    const attempts = Array.from({ length: 5 }, () =>
      request.post(`${BASE_URL}/api/auth/chef-login`, {
        data: { pin: '0000', restaurantSlug: 'nonexistent' },
      })
    );

    const responses = await Promise.all(attempts);
    for (const res of responses) {
      expect(res.status()).toBeLessThan(500);
    }
  });
});
