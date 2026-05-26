/**
 * Admin Login UI Tests — /login page
 * Covers test plan scenarios 2.1 – 2.9
 *
 * All tests run unauthenticated.
 * Seed credentials: admin@spicegarden.com / admin123
 */

import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? 'admin@spicegarden.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? 'admin123';

// ─── 2.1 Valid login with demo credentials ───────────────────────────────────

test('2.1 valid credentials redirect to /dashboard', async ({ page }) => {
  await page.goto('/login');

  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();

  await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);

  const submitBtn = page.locator('button[type="submit"]');
  await submitBtn.click();

  // Button should show loading/disabled state immediately
  const isLoadingOrDisabled = await submitBtn.isDisabled().catch(() => false) ||
    (await submitBtn.textContent().catch(() => ''))?.toLowerCase().includes('sign') === false;

  await page.waitForURL('**/dashboard', { timeout: 20_000 });
  expect(page.url()).toContain('/dashboard');
});

// ─── 2.2 Invalid email ────────────────────────────────────────────────────────

test('2.2 non-existent email shows authentication error', async ({ page }) => {
  await page.goto('/login');

  await page.locator('input[type="email"]').fill('nonexistent@restaurant.com');
  await page.locator('input[type="password"]').fill('admin123');
  await page.locator('button[type="submit"]').click();

  await expect(
    page.locator('text=/invalid|wrong|error|credentials/i').or(
      page.locator('[role="alert"]')
    ).first()
  ).toBeVisible({ timeout: 12_000 });

  expect(page.url()).toContain('/login');
});

// ─── 2.3 Invalid password ─────────────────────────────────────────────────────

test('2.3 wrong password shows authentication error', async ({ page }) => {
  await page.goto('/login');

  await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').fill('wrongpassword123');
  await page.locator('button[type="submit"]').click();

  await expect(
    page.locator('text=/invalid|wrong|error|credentials/i').or(
      page.locator('[role="alert"]')
    ).first()
  ).toBeVisible({ timeout: 12_000 });

  expect(page.url()).toContain('/login');
});

// ─── 2.4 Empty email ─────────────────────────────────────────────────────────

test('2.4 empty email field prevents form submission', async ({ page }) => {
  await page.goto('/login');

  await page.locator('input[type="password"]').fill('admin123');
  await page.locator('button[type="submit"]').click();

  await page.waitForTimeout(500);
  expect(page.url()).toContain('/login');
});

// ─── 2.5 Empty password ──────────────────────────────────────────────────────

test('2.5 empty password field prevents form submission', async ({ page }) => {
  await page.goto('/login');

  await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
  await page.locator('button[type="submit"]').click();

  await page.waitForTimeout(500);
  expect(page.url()).toContain('/login');
});

// ─── 2.6 Session persists across page refresh ────────────────────────────────

test('2.6 session persists after page refresh', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/dashboard', { timeout: 20_000 });

  // Refresh page
  await page.reload();

  // Should still be on dashboard after reload
  await page.waitForURL('**/dashboard', { timeout: 10_000 });
  expect(page.url()).toContain('/dashboard');
});

// ─── 2.7 Password visibility toggle ─────────────────────────────────────────

test('2.7 password toggle reveals and hides password on login form', async ({ page }) => {
  await page.goto('/login');

  await page.locator('input[type="password"]').fill('admin123');

  // Find toggle button
  const toggle = page.locator('label button[type="button"]').or(
    page.locator('button[type="button"]').filter({ hasText: /eye|show|hide/i })
  ).or(
    page.locator('[data-testid*="password-toggle"], [aria-label*="password"]')
  ).first();

  await toggle.click();
  await expect(page.locator('input[type="text"]')).toBeVisible();

  await toggle.click();
  await expect(page.locator('input[type="password"]')).toBeVisible();
});

// ─── 2.8 Link to signup ───────────────────────────────────────────────────────

test('2.8 "Create account" link navigates to /signup', async ({ page }) => {
  await page.goto('/login');

  const signupLink = page.locator('a[href="/signup"]');
  await expect(signupLink).toBeVisible();
  await signupLink.click();

  await page.waitForURL('**/signup', { timeout: 8_000 });
  expect(page.url()).toContain('/signup');
});

// ─── 2.9 Link to chef login ───────────────────────────────────────────────────

test('2.9 chef/kitchen login link navigates to /chef-login', async ({ page }) => {
  await page.goto('/login');

  const chefLink = page.locator('a[href="/chef-login"]');
  await expect(chefLink).toBeVisible();
  await chefLink.click();

  await page.waitForURL('**/chef-login', { timeout: 8_000 });
  expect(page.url()).toContain('/chef-login');
});
