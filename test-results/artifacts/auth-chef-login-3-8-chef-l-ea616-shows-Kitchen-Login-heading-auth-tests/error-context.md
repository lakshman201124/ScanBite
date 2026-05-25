# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth\chef-login.spec.ts >> 3.8 chef-login page shows Kitchen Login heading
- Location: tests\auth\chef-login.spec.ts:148:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('h1').filter({ hasText: /kitchen login|chef|kds/i }).first()
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('h1').filter({ hasText: /kitchen login|chef|kds/i }).first()

```

```yaml
- img
- heading "Staff Portal" [level=1]
- paragraph: ScanBite · Chef & Waiter login
- heading "Enter your phone" [level=2]
- paragraph: New here? We'll set up your account.
- text: "+91"
- textbox "98765 43210"
- button "Continue →" [disabled]
- link "Admin login →":
  - /url: /login
- alert
```

# Test source

```ts
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
  146 | // ─── 3.8 Page renders correct heading ────────────────────────────────────────
  147 | 
  148 | test('3.8 chef-login page shows Kitchen Login heading', async ({ page }) => {
  149 |   await gotoChefLogin(page);
  150 | 
  151 |   await expect(
  152 |     page.locator('h1').filter({ hasText: /kitchen login|chef|kds/i }).first()
> 153 |   ).toBeVisible({ timeout: 10_000 });
      |     ^ Error: expect(locator).toBeVisible() failed
  154 | });
  155 | 
```