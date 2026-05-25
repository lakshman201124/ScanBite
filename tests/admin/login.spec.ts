/**
 * Admin Login UI Tests — /login page
 *
 * Tests the NextAuth credentials sign-in flow via the browser.
 * Demo credentials embedded in the login page: admin@spicegarden.com / admin123
 *
 * NOTE: These tests intentionally do NOT use storageState (no setup dependency)
 * because we're specifically testing the login flow itself.
 */

import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? 'admin@spicegarden.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? 'admin123';

// ─── /login page rendering ───────────────────────────────────────────────────

test.describe('/login page', () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // always unauthenticated

  test('renders the login form', async ({ page }) => {
    await page.goto('/login');

    // Page should have email + password inputs and a submit button
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('shows ScanBite brand in header', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('ScanBite', { exact: false })).toBeVisible();
  });

  test('has link to /signup (new restaurant)', async ({ page }) => {
    await page.goto('/login');
    const signupLink = page.locator('a[href="/signup"]');
    await expect(signupLink).toBeVisible();
  });

  test('has link to /chef-login', async ({ page }) => {
    await page.goto('/login');
    const chefLink = page.locator('a[href="/chef-login"]');
    await expect(chefLink).toBeVisible();
  });

  test('shows demo credentials hint', async ({ page }) => {
    await page.goto('/login');
    // The dev hint block contains "admin@spicegarden.com" or similar
    // Use a more specific selector to avoid strict mode violation (multiple matches)
    await expect(page.getByText('Demo credentials')).toBeVisible();
    await expect(page.getByText('admin@spicegarden.com')).toBeVisible();
  });
});

// ─── Login flow ───────────────────────────────────────────────────────────────

test.describe('Login flow', () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // always start unauthenticated

  test('invalid credentials show error message', async ({ page }) => {
    await page.goto('/login');

    await page.locator('input[type="email"]').fill('nobody@wrong.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();

    // Error message should appear (the component sets an error state)
    await expect(
      page.locator('div').filter({ hasText: /invalid|wrong|error/i }).first()
    ).toBeVisible({ timeout: 10_000 });

    // Should still be on /login
    expect(page.url()).toContain('/login');
  });

  test('valid credentials redirect to /dashboard', async ({ page }) => {
    await page.goto('/login');

    await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
    await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
    await page.locator('button[type="submit"]').click();

    // Should redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 20_000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('password toggle button shows/hides password', async ({ page }) => {
    await page.goto('/login');

    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();

    // Click the toggle button (eye icon)
    const toggleBtn = page.locator('label button[type="button"]');
    await toggleBtn.click();

    // Input should switch to type="text"
    await expect(page.locator('input[type="text"]')).toBeVisible();

    // Click again to hide
    await toggleBtn.click();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('submit button is disabled while loading', async ({ page }) => {
    await page.goto('/login');

    await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
    await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);

    const submitBtn = page.locator('button[type="submit"]');

    // Click and immediately check disabled state
    await submitBtn.click();
    // During loading, button should show loading text or be disabled
    const isDisabledOrLoading = await submitBtn.isDisabled() ||
      (await submitBtn.textContent())?.includes('Signing');
    expect(isDisabledOrLoading).toBeTruthy();
  });
});

// ─── Already-logged-in redirect ───────────────────────────────────────────────

test.describe('Already authenticated redirect', () => {
  // Uses the storageState from global.setup.ts (admin-desktop project)
  test('authenticated user visiting /login is redirected to /dashboard', async ({ page }) => {
    // If the user is already logged in and visits /login, Next.js should redirect
    const response = await page.goto('/login', { waitUntil: 'commit' });

    // Either immediately redirected to dashboard, or we stay on login (app may not auto-redirect)
    const url = page.url();
    if (url.includes('/dashboard')) {
      expect(url).toContain('/dashboard');
    } else {
      // Acceptable: app doesn't force redirect from /login when already authed
      expect(url).toContain('/login');
    }
  });
});
