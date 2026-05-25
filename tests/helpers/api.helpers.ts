import { APIResponse, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

export { BASE_URL };

export function expectSuccess(res: APIResponse, expectedStatus = 200) {
  expect(res.status(), `Expected HTTP ${expectedStatus}, got ${res.status()}`).toBe(expectedStatus);
}

export function expectError(res: APIResponse, expectedStatus: number) {
  expect(res.status(), `Expected HTTP ${expectedStatus} error, got ${res.status()}`).toBe(expectedStatus);
}

/** Extracts Set-Cookie value by name from a response */
export function getCookie(res: APIResponse, name: string): string | undefined {
  const headers = res.headersArray().filter(h => h.name.toLowerCase() === 'set-cookie');
  for (const h of headers) {
    if (h.value.startsWith(`${name}=`)) {
      return h.value.split(';')[0].split('=').slice(1).join('=');
    }
  }
  return undefined;
}

/** Asserts a JSON body has success:true */
export async function expectSuccessBody(res: APIResponse) {
  const body = await res.json() as Record<string, unknown>;
  expect(body.success, `Body should have success:true, got: ${JSON.stringify(body)}`).toBe(true);
  return body;
}

/** Asserts a JSON body has success:false or an error field */
export async function expectErrorBody(res: APIResponse) {
  const body = await res.json() as Record<string, unknown>;
  expect(
    body.success === false || body.error !== undefined,
    `Body should indicate an error, got: ${JSON.stringify(body)}`
  ).toBe(true);
  return body;
}
