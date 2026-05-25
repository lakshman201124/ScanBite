# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth\api-chef-validation.spec.ts >> 4.9 Chef Login API — schema validation (OTP flow) >> valid {phone, code} shape passes schema — OTP verified or 401
- Location: tests\auth\api-chef-validation.spec.ts:99:7

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected value: 422
Received array: [401, 404]
```

# Test source

```ts
  5   | 
  6   | import { test, expect } from '@playwright/test';
  7   | 
  8   | const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
  9   | const CHEF_SLUG = process.env.TEST_CHEF_SLUG ?? 'spice-garden';
  10  | 
  11  | // ─── 4.8 Chef PIN format validation ──────────────────────────────────────────
  12  | 
  13  | test.describe('4.8 Chef Login API — PIN format validation', () => {
  14  |   test('PIN shorter than 4 digits returns 400', async ({ request }) => {
  15  |     const res = await request.post(`${BASE_URL}/api/auth/chef-login`, {
  16  |       data: { pin: '123', restaurantSlug: CHEF_SLUG },
  17  |     });
  18  | 
  19  |     expect(res.status()).toBeGreaterThanOrEqual(400);
  20  |     expect(res.status()).toBeLessThan(500);
  21  |   });
  22  | 
  23  |   test('2-digit PIN returns 400', async ({ request }) => {
  24  |     const res = await request.post(`${BASE_URL}/api/auth/chef-login`, {
  25  |       data: { pin: '12', restaurantSlug: CHEF_SLUG },
  26  |     });
  27  | 
  28  |     expect(res.status()).toBeGreaterThanOrEqual(400);
  29  |     expect(res.status()).toBeLessThan(500);
  30  |   });
  31  | 
  32  |   test('non-numeric PIN (alpha chars) returns 400', async ({ request }) => {
  33  |     const res = await request.post(`${BASE_URL}/api/auth/chef-login`, {
  34  |       data: { pin: 'abcd', restaurantSlug: CHEF_SLUG },
  35  |     });
  36  | 
  37  |     expect(res.status()).toBeGreaterThanOrEqual(400);
  38  |     expect(res.status()).toBeLessThan(500);
  39  |   });
  40  | 
  41  |   test('mixed alphanumeric PIN returns 400', async ({ request }) => {
  42  |     const res = await request.post(`${BASE_URL}/api/auth/chef-login`, {
  43  |       data: { pin: '12ab', restaurantSlug: CHEF_SLUG },
  44  |     });
  45  | 
  46  |     expect(res.status()).toBeGreaterThanOrEqual(400);
  47  |     expect(res.status()).toBeLessThan(500);
  48  |   });
  49  | 
  50  |   test('empty PIN returns 400', async ({ request }) => {
  51  |     const res = await request.post(`${BASE_URL}/api/auth/chef-login`, {
  52  |       data: { pin: '', restaurantSlug: CHEF_SLUG },
  53  |     });
  54  | 
  55  |     expect(res.status()).toBeGreaterThanOrEqual(400);
  56  |     expect(res.status()).toBeLessThan(500);
  57  |   });
  58  | 
  59  |   test('missing PIN field returns 400', async ({ request }) => {
  60  |     const res = await request.post(`${BASE_URL}/api/auth/chef-login`, {
  61  |       data: { restaurantSlug: CHEF_SLUG },
  62  |     });
  63  | 
  64  |     expect(res.status()).toBeGreaterThanOrEqual(400);
  65  |     expect(res.status()).toBeLessThan(500);
  66  |   });
  67  | });
  68  | 
  69  | // ─── 4.9 Chef API validates restaurant slug ───────────────────────────────────
  70  | 
  71  | // NOTE: The chef-login API migrated from {pin, restaurantSlug} to {phone, code} (OTP flow).
  72  | // Old PIN/slug fields are now rejected by Zod validation (422).
  73  | test.describe('4.9 Chef Login API — schema validation (OTP flow)', () => {
  74  |   test('sending old-format {pin, restaurantSlug} is rejected with 4xx', async ({ request }) => {
  75  |     // Old API shape — now invalid; Zod returns 422
  76  |     const res = await request.post(`${BASE_URL}/api/auth/chef-login`, {
  77  |       data: { pin: '1234', restaurantSlug: 'nonexistent-xyz-restaurant' },
  78  |     });
  79  |     expect(res.status()).toBeGreaterThanOrEqual(400);
  80  |     expect(res.status()).toBeLessThan(500);
  81  |   });
  82  | 
  83  |   test('missing phone field returns 400/422', async ({ request }) => {
  84  |     const res = await request.post(`${BASE_URL}/api/auth/chef-login`, {
  85  |       data: { code: '123456' },
  86  |     });
  87  |     expect(res.status()).toBeGreaterThanOrEqual(400);
  88  |     expect(res.status()).toBeLessThan(500);
  89  |   });
  90  | 
  91  |   test('missing code field returns 400/422', async ({ request }) => {
  92  |     const res = await request.post(`${BASE_URL}/api/auth/chef-login`, {
  93  |       data: { phone: '+919876543210' },
  94  |     });
  95  |     expect(res.status()).toBeGreaterThanOrEqual(400);
  96  |     expect(res.status()).toBeLessThan(500);
  97  |   });
  98  | 
  99  |   test('valid {phone, code} shape passes schema — OTP verified or 401', async ({ request }) => {
  100 |     // With correct shape but invalid OTP, should get 401 (OTP failed) — NOT 422 (schema error)
  101 |     const res = await request.post(`${BASE_URL}/api/auth/chef-login`, {
  102 |       data: { phone: '+919876543210', code: '000000' },
  103 |     });
  104 |     // 401 = schema OK, OTP invalid. 422 = schema error (bad).
> 105 |     expect([401, 404]).toContain(res.status());
      |                        ^ Error: expect(received).toContain(expected) // indexOf
  106 |   });
  107 | });
  108 | 
```