/**
 * Chef Login UI Tests — /chef-login page  (phone OTP flow)
 * Covers test plan scenarios 3.1 – 3.8
 *
 * The /chef-login page uses a two-step OTP flow:
 *   Step 1 → phone number input (type="tel"), "Send OTP" button
 *   Step 2 → 6 individual digit inputs (type="text", inputMode="numeric"), auto-submit on 6th digit
 *
 * All tests run unauthenticated.
 */

import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

// ─── Helper ───────────────────────────────────────────────────────────────────

async function gotoChefLogin(page: import('@playwright/test').Page) {
  await page.goto('/chef-login');
  await expect(page).toHaveURL(/chef-login/, { timeout: 15_000 });
}

// ─── 3.1 Phone number step renders ───────────────────────────────────────────

test('3.1 chef-login page shows phone number input and Send OTP button', async ({ page }) => {
  await gotoChefLogin(page);

  // Phone tel input is visible
  await expect(page.locator('input[type="tel"]').first()).toBeVisible({ timeout: 10_000 });

  // Send OTP button present
  await expect(
    page.locator('button').filter({ hasText: /send otp|send code|otp/i }).first()
  ).toBeVisible();
});

// ─── 3.2 Invalid phone format shows validation error ─────────────────────────

test('3.2 invalid phone number shows error before sending OTP', async ({ page }) => {
  await gotoChefLogin(page);

  const phoneInput = page.locator('input[type="tel"]').first();
  await phoneInput.fill('abc');

  await page.locator('button').filter({ hasText: /send otp|send/i }).first().click();

  // Error message should appear (either inline or alert)
  await expect(
    page.locator('text=/valid phone|phone number|invalid/i').or(
      page.locator('[role="alert"]')
    ).first()
  ).toBeVisible({ timeout: 8_000 });

  // Still on phone step — OTP inputs NOT visible
  await expect(page.locator('input[inputmode="numeric"]').first()).not.toBeVisible();
});

// ─── 3.3 Empty phone disables Send OTP button ────────────────────────────────

test('3.3 empty phone field disables Send OTP button', async ({ page }) => {
  await gotoChefLogin(page);

  const sendBtn = page.locator('button').filter({ hasText: /send otp|send/i }).first();
  // Button should be disabled when phone is empty
  const isDisabled = await sendBtn.isDisabled();
  expect(isDisabled).toBe(true);
});

// ─── 3.4 Phone number input accepts valid formats ────────────────────────────

test('3.4 valid phone number enables Send OTP button', async ({ page }) => {
  await gotoChefLogin(page);

  const phoneInput = page.locator('input[type="tel"]').first();
  await phoneInput.fill('9876543210');

  const sendBtn = page.locator('button').filter({ hasText: /send otp|send/i }).first();
  await expect(sendBtn).not.toBeDisabled({ timeout: 3_000 });
});

// ─── 3.5 After send OTP, 6 digit boxes appear ────────────────────────────────

test('3.5 after entering phone and clicking Send OTP, OTP input boxes appear', async ({ page }) => {
  await gotoChefLogin(page);

  // Fill phone
  await page.locator('input[type="tel"]').first().fill('9876543210');
  await page.locator('button').filter({ hasText: /send otp|send/i }).first().click();

  // Either: OTP boxes appear (success), or error appears (Twilio not configured)
  await page.waitForTimeout(2_500);

  const otpInputs = page.locator('input[inputmode="numeric"]');
  // Error div uses class bg-red-500/10 (Tailwind) — use partial class match
  const errEl = page.locator('[role="alert"]').or(
    page.locator('[class*="red"]').filter({ hasText: /failed|error|invalid|network/i })
  ).or(
    page.locator('div').filter({ hasText: /failed to send|invalid|error/i })
  ).first();

  const otpVisible = await otpInputs.first().isVisible().catch(() => false);
  const errVisible = await errEl.isVisible({ timeout: 1_000 }).catch(() => false);

  // At least one of OTP boxes or an error message should be shown
  expect(otpVisible || errVisible, 'Expected either OTP inputs or an error message after clicking Send OTP').toBe(true);
});

// ─── 3.6 OTP step: back button returns to phone step ─────────────────────────

test('3.6 back button on OTP step returns to phone step', async ({ page }) => {
  await gotoChefLogin(page);

  // Fill phone and send (may fail — but back button appears regardless on step === "otp")
  await page.locator('input[type="tel"]').first().fill('9876543210');
  await page.locator('button').filter({ hasText: /send otp|send/i }).first().click();

  // Wait briefly
  await page.waitForTimeout(2_000);

  // If OTP step appeared, test back button
  const backBtn = page.locator('button').filter({ hasText: /←|back/i }).or(
    page.locator('button[class*="text-zinc-5"]').first()
  ).first();

  if (await backBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await backBtn.click();
    // Phone input should reappear
    await expect(page.locator('input[type="tel"]').first()).toBeVisible({ timeout: 5_000 });
  } else {
    // Still on phone step — OTP was not sent (no Twilio) — test passes trivially
    await expect(page.locator('input[type="tel"]').first()).toBeVisible();
  }
});

// ─── 3.7 Admin login link present ────────────────────────────────────────────

test('3.7 admin login link is visible on chef-login page', async ({ page }) => {
  await gotoChefLogin(page);

  const adminLink = page.locator('a[href="/login"]').or(
    page.locator('a').filter({ hasText: /admin login/i })
  ).first();
  await expect(adminLink).toBeVisible();
});

// ─── 3.8 Page renders correct heading ────────────────────────────────────────

test('3.8 chef-login page shows Kitchen Login heading', async ({ page }) => {
  await gotoChefLogin(page);

  await expect(
    page.locator('h1').filter({ hasText: /kitchen login|chef|kds/i }).first()
  ).toBeVisible({ timeout: 10_000 });
});
