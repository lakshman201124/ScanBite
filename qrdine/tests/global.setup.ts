import { test as setup, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const ADMIN_SESSION_FILE = path.join('.playwright', 'admin-session.json');

setup('authenticate as admin and save session', async ({ page }) => {
  const email = process.env.TEST_ADMIN_EMAIL ?? 'admin@spicegarden.com';
  const password = process.env.TEST_ADMIN_PASSWORD ?? 'admin123';

  fs.mkdirSync(path.dirname(ADMIN_SESSION_FILE), { recursive: true });

  await page.goto('/login');
  await expect(page).toHaveTitle(/ScanBite|QR Dine|Restaurant/i, { timeout: 30_000 });

  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();

  // Detect both success and failure redirects for a clear error message
  const result = await Promise.race([
    page.waitForURL('**/dashboard', { timeout: 30_000 }).then(() => 'success'),
    page.waitForURL('**/api/auth/error', { timeout: 30_000 }).then(() => 'auth-error'),
    page.waitForURL('**/login?error=*', { timeout: 30_000 }).then(() => 'login-error'),
  ]);

  if (result !== 'success') {
    const currentUrl = page.url();
    throw new Error(
      `Login failed (${result}) for ${email}. Landed on: ${currentUrl}\n` +
      `Check that AUTH_SECRET, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY ` +
      `secrets are set and the test user exists in the database.`
    );
  }

  await expect(page.locator('h1, main').first()).toBeVisible();
  await page.context().storageState({ path: ADMIN_SESSION_FILE });
  console.log(`✅ Admin session saved to ${ADMIN_SESSION_FILE}`);
});
