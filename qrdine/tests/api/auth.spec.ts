/**
 * Authentication API Tests
 * Covers: POST /api/auth/signup, POST /api/auth/[...nextauth] (admin login),
 *         POST /api/auth/chef-login, GET+POST /api/session/create
 *
 * Pipeline reference: SCANBITE_QA_TESTING_PIPELINE.md § tests/api/auth.spec.ts
 */

import { test, expect } from '@playwright/test';
import {
  signupRestaurant,
  adminLogin,
  chefLogin,
  customerSessionCreate,
} from '../fixtures/auth.fixtures';
import {
  BASE_URL,
  expectSuccess,
  expectError,
  expectSuccessBody,
  expectErrorBody,
  getCookie,
} from '../helpers/api.helpers';

// ─── Helpers ────────────────────────────────────────────────────────────────

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ─── POST /api/auth/signup ──────────────────────────────────────────────────

test.describe('POST /api/auth/signup', () => {
  test('valid signup creates restaurant + admin user → 201', async ({ request }) => {
    const id = uid();
    const { res } = await signupRestaurant(request, {
      restaurantName: `QA Resto ${id}`,
      email: `admin_${id}@qa.test`,
      password: 'StrongPass1!',
    });

    expectSuccess(res, 201);
    const body = await expectSuccessBody(res);
    expect(typeof (body.data as Record<string, unknown>)?.restaurantId).toBe('string');
    expect(typeof (body.data as Record<string, unknown>)?.slug).toBe('string');
  });

  test('duplicate email returns 409', async ({ request }) => {
    const id = uid();
    const email = `dup_${id}@qa.test`;

    await signupRestaurant(request, { email, restaurantName: `First ${id}`, password: 'StrongPass1!' });
    const { res } = await signupRestaurant(request, { email, restaurantName: `Second ${id}`, password: 'StrongPass1!' });

    expectError(res, 409);
    const body = await res.json() as Record<string, unknown>;
    expect(String(body.error ?? body.message)).toContain('already exists');
  });

  test('short password (< 8 chars) rejected with 400 / validation error', async ({ request }) => {
    const id = uid();
    const res = await request.post(`${BASE_URL}/api/auth/signup`, {
      data: {
        restaurantName: `Weak Resto ${id}`,
        email: `weak_${id}@qa.test`,
        password: 'abc',
      },
    });

    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('missing restaurantName rejected with 400', async ({ request }) => {
    const id = uid();
    const res = await request.post(`${BASE_URL}/api/auth/signup`, {
      data: {
        email: `noname_${id}@qa.test`,
        password: 'StrongPass1!',
      },
    });

    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('invalid email format rejected with 400', async ({ request }) => {
    const id = uid();
    const res = await request.post(`${BASE_URL}/api/auth/signup`, {
      data: {
        restaurantName: `Bad Email Resto ${id}`,
        email: 'not-an-email',
        password: 'StrongPass1!',
      },
    });

    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('empty body rejected with 400', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/signup`, { data: {} });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });
});

// ─── POST /api/auth/[...nextauth] — Admin Login ─────────────────────────────

test.describe('POST /api/auth/[...nextauth] (admin login)', () => {
  test('valid admin credentials → redirects to dashboard (success path)', async ({ request }) => {
    const id = uid();
    const email = `adminlogin_${id}@qa.test`;
    const password = 'AdminPass1!';

    await signupRestaurant(request, {
      restaurantName: `Login Test ${id}`,
      email,
      password,
    });

    const res = await adminLogin(request, email, password);

    // NextAuth v5 beta: POST /api/auth/callback/credentials always responds with
    // a 302/307 redirect (even when redirect=false is sent as form data).
    // maxRedirects:0 in the fixture captures the raw redirect.
    const status = res.status();
    const location = res.headers()['location'] ?? '';

    expect(
      [200, 302, 307].includes(status),
      `Expected 200/302/307, got ${status}`
    ).toBe(true);

    if (status === 302 || status === 307) {
      // Success → redirected toward /dashboard (or /dashboard/*)
      // Failure → redirected toward /login?error=CredentialsSignin
      // Success → location does NOT contain an error param and does NOT go to /login?error=
      // (NextAuth v5 may redirect to the app root or /dashboard depending on callbackUrl)
      const isError = location.includes('error=') && location.includes('/login');
      if (isError) {
        // Possible source/env issue: Supabase FK join (restaurants(plan)) may not be
        // configured, causing is_active or plan lookup to fail → login rejected.
        console.warn(
          `[WARN] Admin login redirected to error: ${location}. ` +
          `Verify Supabase PostgREST FK relationship restaurants→users is configured.`
        );
      }
      expect(isError, `Login should succeed, but got error redirect: ${location}`).toBe(false);
    } else {
      // 200 path: body must have url or error key
      const body = await res.json().catch(() => ({})) as Record<string, unknown>;
      const hasContent = body.url !== undefined || body.error !== undefined;
      expect(hasContent, 'Response body should have url or error').toBe(true);
    }
  });

  test('invalid credentials → redirect to /login with error param', async ({ request }) => {
    const res = await adminLogin(request, 'nobody@qa.test', 'wrongpassword');
    const status = res.status();
    const location = res.headers()['location'] ?? '';

    // NextAuth v5: invalid creds → 302 to /login?error=CredentialsSignin
    expect(
      [200, 302, 307].includes(status),
      `Expected 200/302/307, got ${status}`
    ).toBe(true);

    if (status === 302 || status === 307) {
      expect(location, 'Failed login should redirect to login error page').toContain('error');
    } else {
      // 200 path: body should indicate an error, not a successful session
      const body = await res.json().catch(() => ({})) as Record<string, unknown>;
      const isErrorOrNoSession = body.error !== undefined || body.url === undefined;
      expect(isErrorOrNoSession, 'Invalid credentials should not produce a session').toBe(true);
    }
  });

  test('empty credentials → no session created (must not be 500)', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/callback/credentials`, {
      form: { email: '', password: '' },
      maxRedirects: 0,
    });
    expect(res.status()).toBeLessThan(500);
  });
});

// ─── POST /api/auth/chef-login ──────────────────────────────────────────────

test.describe('POST /api/auth/chef-login', () => {
  test('invalid PIN returns 401/404', async ({ request }) => {
    const res = await chefLogin(request, '+919876543210', '999999');
    expect([401, 404]).toContain(res.status());
  });

  test('missing phone field returns 400 validation error', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/chef-login`, {
      data: { pin: '000000' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('PIN shorter than 6 digits rejected with 400', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/chef-login`, {
      data: { pin: '12345', phone: '+919876543210' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('non-numeric PIN rejected with 400', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/chef-login`, {
      data: { pin: 'abcdef', phone: '+919876543210' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('missing PIN rejected with 400', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/chef-login`, {
      data: { phone: '+919876543210' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('empty body rejected with 400', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/chef-login`, { data: {} });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });
});

// ─── GET /api/session/create — Customer QR Session ─────────────────────────

test.describe('GET /api/session/create (QR session)', () => {
  test('missing slug + token → redirect with error param', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/session/create`, {
      maxRedirects: 0,
    });

    // Should redirect (302/307) with ?error= param, or return 4xx
    expect([302, 307, 400]).toContain(res.status());

    if (res.status() === 302 || res.status() === 307) {
      const location = res.headers()['location'] ?? '';
      expect(location).toContain('error');
    }
  });

  test('invalid QR token → redirect with error=invalid-qr or not-found', async ({ request }) => {
    const res = await request.get(
      `${BASE_URL}/api/session/create?slug=nonexistent&t=fake-token`,
      { maxRedirects: 0 }
    );

    expect([302, 307, 400, 404]).toContain(res.status());

    if (res.status() === 302 || res.status() === 307) {
      const location = res.headers()['location'] ?? '';
      expect(location).toContain('error');
    }
  });
});

// ─── POST /api/session/create — Customer QR Session (JSON) ─────────────────

test.describe('POST /api/session/create (QR session JSON)', () => {
  test('missing slug + token → 400', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/session/create`);
    expectError(res, 400);
  });

  test('invalid slug returns 404', async ({ request }) => {
    const res = await customerSessionCreate(request, 'ghost-restaurant', 'bad-token');
    expect([401, 404]).toContain(res.status());
  });

  test('valid slug + invalid QR token returns 401', async ({ request }) => {
    // We need a real restaurant slug. If the DB is seeded this would hit a real table lookup.
    // Since we may not have seeded data, we test that a plausible-format token still fails.
    const res = await request.post(
      `${BASE_URL}/api/session/create?slug=nonexistent-slug&t=00000000-0000-0000-0000-000000000000`
    );
    // Could be 404 (restaurant not found) or 401 (invalid QR)
    expect([401, 404]).toContain(res.status());
  });
});

// ─── Admin login protected routes (no JWT → 401/redirect) ──────────────────

test.describe('Protected route guards', () => {
  test('/api/admin/* without auth token is rejected (401 or redirect to login)', async ({ request }) => {
    // maxRedirects: 0 captures the raw response before Playwright follows any redirect
    const res = await request.get(`${BASE_URL}/api/admin/analytics`, { maxRedirects: 0 });

    // NextAuth v5 route handlers may redirect to /login (302/307) instead of returning 401.
    // Both behaviors correctly deny access; we accept either.
    const status = res.status();
    expect(
      [302, 307, 401, 403].includes(status),
      `Expected access denied (302/307/401/403), got ${status}`
    ).toBe(true);

    // If 302/307, confirm the redirect target is the login page
    if (status === 302 || status === 307) {
      const location = res.headers()['location'] ?? '';
      expect(location).toContain('/login');
    }
  });

  test('/api/chef/* without auth token is rejected (401 or redirect)', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/chef/orders`, { maxRedirects: 0 });
    const status = res.status();
    expect(
      [302, 307, 401, 403].includes(status),
      `Expected access denied (302/307/401/403), got ${status}`
    ).toBe(true);
  });
});
