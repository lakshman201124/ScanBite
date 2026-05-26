import { APIRequestContext } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

export interface AdminSession {
  cookies: string;
  restaurantId: string;
}

export interface ChefSession {
  token: string;
  restaurantId: string;
}

export interface CustomerSession {
  sessionToken: string;
  restaurantId: string;
  tableId: string;
}

/** Signs up a new restaurant+admin and returns { restaurantId, slug } */
export async function signupRestaurant(
  request: APIRequestContext,
  overrides?: Partial<{
    restaurantName: string;
    email: string;
    password: string;
    phone: string;
    otpCode: string;
  }>
) {
  const randomPhone = `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`;
  const payload = {
    restaurantName: overrides?.restaurantName ?? `Test Restaurant ${Date.now()}`,
    email: overrides?.email ?? `admin_${Date.now()}@test.com`,
    password: overrides?.password ?? 'TestPass123!',
    phone: overrides?.phone ?? randomPhone,
    otpCode: overrides?.otpCode ?? '000000',
  };
  const res = await request.post(`${BASE_URL}/api/auth/signup`, { data: payload });
  return { res, payload };
}

/** Logs in as admin via NextAuth credentials and returns the Set-Cookie header */
export async function adminLogin(
  request: APIRequestContext,
  email: string,
  password: string
) {
  // NextAuth credentials sign-in: POST /api/auth/callback/credentials
  const csrfRes = await request.get(`${BASE_URL}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json() as { csrfToken: string };

  const res = await request.post(`${BASE_URL}/api/auth/callback/credentials`, {
    form: { email, password, csrfToken, redirect: 'false', json: 'true' },
    maxRedirects: 0,
  });
  return res;
}

/** Logs in as chef via /api/auth/chef-login → returns { token } */
export async function chefLogin(
  request: APIRequestContext,
  phone: string,
  code: string
) {
  const res = await request.post(`${BASE_URL}/api/auth/chef-login`, {
    data: { phone, code },
  });
  return res;
}

/** Creates a customer session via /api/session/create (POST variant) */
export async function customerSessionCreate(
  request: APIRequestContext,
  slug: string,
  qrToken: string
) {
  const res = await request.post(
    `${BASE_URL}/api/session/create?slug=${slug}&t=${qrToken}`
  );
  return res;
}
