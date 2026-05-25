# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth\chef-login.spec.ts >> 3.2 invalid phone number shows error before sending OTP
- Location: tests\auth\chef-login.spec.ts:39:5

# Error details

```
TimeoutError: locator.click: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('button').filter({ hasText: /send otp|send/i }).first()

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e5]:
    - generic [ref=e6]:
      - img [ref=e8]
      - generic [ref=e12]:
        - heading "Staff Portal" [level=1] [ref=e13]
        - paragraph [ref=e14]: ScanBite · Chef & Waiter login
    - generic [ref=e15]:
      - heading "Enter your phone" [level=2] [ref=e16]
      - paragraph [ref=e17]: New here? We'll set up your account.
      - generic [ref=e18]:
        - generic [ref=e19]: "+91"
        - textbox "98765 43210" [active] [ref=e20]: abc
      - button "Continue →" [ref=e21]
    - link "Admin login →" [ref=e23] [cursor=pointer]:
      - /url: /login
  - button "Open Next.js Dev Tools" [ref=e29] [cursor=pointer]:
    - img [ref=e30]
  - alert [ref=e33]
```

# Test source

```ts
  1   | /**
  2   |  * Chef Login UI Tests — /chef-login page  (phone OTP flow)
  3   |  * Covers test plan scenarios 3.1 – 3.8
  4   |  *
  5   |  * The /chef-login page uses a two-step OTP flow:
  6   |  *   Step 1 → phone number input (type="tel"), "Send OTP" button
  7   |  *   Step 2 → 6 individual digit inputs (type="text", inputMode="numeric"), auto-submit on 6th digit
  8   |  *
  9   |  * All tests run unauthenticated.
  10  |  */
  11  | 
  12  | import { test, expect } from '@playwright/test';
  13  | 
  14  | test.use({ storageState: { cookies: [], origins: [] } });
  15  | 
  16  | // ─── Helper ───────────────────────────────────────────────────────────────────
  17  | 
  18  | async function gotoChefLogin(page: import('@playwright/test').Page) {
  19  |   await page.goto('/chef-login');
  20  |   await expect(page).toHaveURL(/chef-login/, { timeout: 15_000 });
  21  | }
  22  | 
  23  | // ─── 3.1 Phone number step renders ───────────────────────────────────────────
  24  | 
  25  | test('3.1 chef-login page shows phone number input and Send OTP button', async ({ page }) => {
  26  |   await gotoChefLogin(page);
  27  | 
  28  |   // Phone tel input is visible
  29  |   await expect(page.locator('input[type="tel"]').first()).toBeVisible({ timeout: 10_000 });
  30  | 
  31  |   // Send OTP button present
  32  |   await expect(
  33  |     page.locator('button').filter({ hasText: /send otp|send code|otp/i }).first()
  34  |   ).toBeVisible();
  35  | });
  36  | 
  37  | // ─── 3.2 Invalid phone format shows validation error ─────────────────────────
  38  | 
  39  | test('3.2 invalid phone number shows error before sending OTP', async ({ page }) => {
  40  |   await gotoChefLogin(page);
  41  | 
  42  |   const phoneInput = page.locator('input[type="tel"]').first();
  43  |   await phoneInput.fill('abc');
  44  | 
> 45  |   await page.locator('button').filter({ hasText: /send otp|send/i }).first().click();
      |                                                                              ^ TimeoutError: locator.click: Timeout 15000ms exceeded.
  46  | 
  47  |   // Error message should appear (either inline or alert)
  48  |   await expect(
  49  |     page.locator('text=/valid phone|phone number|invalid/i').or(
  50  |       page.locator('[role="alert"]')
  51  |     ).first()
  52  |   ).toBeVisible({ timeout: 8_000 });
  53  | 
  54  |   // Still on phone step — OTP inputs NOT visible
  55  |   await expect(page.locator('input[inputmode="numeric"]').first()).not.toBeVisible();
  56  | });
  57  | 
  58  | // ─── 3.3 Empty phone disables Send OTP button ────────────────────────────────
  59  | 
  60  | test('3.3 empty phone field disables Send OTP button', async ({ page }) => {
  61  |   await gotoChefLogin(page);
  62  | 
  63  |   const sendBtn = page.locator('button').filter({ hasText: /send otp|send/i }).first();
  64  |   // Button should be disabled when phone is empty
  65  |   const isDisabled = await sendBtn.isDisabled();
  66  |   expect(isDisabled).toBe(true);
  67  | });
  68  | 
  69  | // ─── 3.4 Phone number input accepts valid formats ────────────────────────────
  70  | 
  71  | test('3.4 valid phone number enables Send OTP button', async ({ page }) => {
  72  |   await gotoChefLogin(page);
  73  | 
  74  |   const phoneInput = page.locator('input[type="tel"]').first();
  75  |   await phoneInput.fill('9876543210');
  76  | 
  77  |   const sendBtn = page.locator('button').filter({ hasText: /send otp|send/i }).first();
  78  |   await expect(sendBtn).not.toBeDisabled({ timeout: 3_000 });
  79  | });
  80  | 
  81  | // ─── 3.5 After send OTP, 6 digit boxes appear ────────────────────────────────
  82  | 
  83  | test('3.5 after entering phone and clicking Send OTP, OTP input boxes appear', async ({ page }) => {
  84  |   await gotoChefLogin(page);
  85  | 
  86  |   // Fill phone
  87  |   await page.locator('input[type="tel"]').first().fill('9876543210');
  88  |   await page.locator('button').filter({ hasText: /send otp|send/i }).first().click();
  89  | 
  90  |   // Either: OTP boxes appear (success), or error appears (Twilio not configured)
  91  |   await page.waitForTimeout(2_500);
  92  | 
  93  |   const otpInputs = page.locator('input[inputmode="numeric"]');
  94  |   // Error div uses class bg-red-500/10 (Tailwind) — use partial class match
  95  |   const errEl = page.locator('[role="alert"]').or(
  96  |     page.locator('[class*="red"]').filter({ hasText: /failed|error|invalid|network/i })
  97  |   ).or(
  98  |     page.locator('div').filter({ hasText: /failed to send|invalid|error/i })
  99  |   ).first();
  100 | 
  101 |   const otpVisible = await otpInputs.first().isVisible().catch(() => false);
  102 |   const errVisible = await errEl.isVisible({ timeout: 1_000 }).catch(() => false);
  103 | 
  104 |   // At least one of OTP boxes or an error message should be shown
  105 |   expect(otpVisible || errVisible, 'Expected either OTP inputs or an error message after clicking Send OTP').toBe(true);
  106 | });
  107 | 
  108 | // ─── 3.6 OTP step: back button returns to phone step ─────────────────────────
  109 | 
  110 | test('3.6 back button on OTP step returns to phone step', async ({ page }) => {
  111 |   await gotoChefLogin(page);
  112 | 
  113 |   // Fill phone and send (may fail — but back button appears regardless on step === "otp")
  114 |   await page.locator('input[type="tel"]').first().fill('9876543210');
  115 |   await page.locator('button').filter({ hasText: /send otp|send/i }).first().click();
  116 | 
  117 |   // Wait briefly
  118 |   await page.waitForTimeout(2_000);
  119 | 
  120 |   // If OTP step appeared, test back button
  121 |   const backBtn = page.locator('button').filter({ hasText: /←|back/i }).or(
  122 |     page.locator('button[class*="text-zinc-5"]').first()
  123 |   ).first();
  124 | 
  125 |   if (await backBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
  126 |     await backBtn.click();
  127 |     // Phone input should reappear
  128 |     await expect(page.locator('input[type="tel"]').first()).toBeVisible({ timeout: 5_000 });
  129 |   } else {
  130 |     // Still on phone step — OTP was not sent (no Twilio) — test passes trivially
  131 |     await expect(page.locator('input[type="tel"]').first()).toBeVisible();
  132 |   }
  133 | });
  134 | 
  135 | // ─── 3.7 Admin login link present ────────────────────────────────────────────
  136 | 
  137 | test('3.7 admin login link is visible on chef-login page', async ({ page }) => {
  138 |   await gotoChefLogin(page);
  139 | 
  140 |   const adminLink = page.locator('a[href="/login"]').or(
  141 |     page.locator('a').filter({ hasText: /admin login/i })
  142 |   ).first();
  143 |   await expect(adminLink).toBeVisible();
  144 | });
  145 | 
```