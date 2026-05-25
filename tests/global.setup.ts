/**
 * Global Setup — signs in as admin once and saves the session to disk.
 * All admin-desktop tests pick up .playwright/admin-session.json as storageState.
 *
 * Credentials (in order of precedence):
 *   1. TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD env vars
 *   2. Demo seed creds from the login page hint: admin@spicegarden.com / admin123
 */

import { test as setup, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const ADMIN_SESSION_FILE = path.join('.playwright', 'admin-session.json');

setup('authenticate as admin and save session', async ({ page }) => {
  const email = process.env.TEST_ADMIN_EMAIL ?? 'admin@spicegarden.com';
  const password = process.env.TEST_ADMIN_PASSWORD ?? 'admin123';

  // Ensure target directory exists
  fs.mkdirSync(path.dirname(ADMIN_SESSION_FILE), { recursive: true });

  await page.goto('/login');
  await expect(page).toHaveTitle(/ScanBite|QR Dine|Restaurant/i, { timeout: 20_000 });

  // Fill in login form
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();

  // Wait for redirect to /dashboard
  await page.waitForURL('**/dashboard', { timeout: 20_000 });

  // Confirm we landed on the dashboard (use .first() to avoid strict mode violation)
  await expect(page.locator('h1, main').first()).toBeVisible();

  // Persist cookies + localStorage so all admin tests reuse this session
  await page.context().storageState({ path: ADMIN_SESSION_FILE });

  console.log(`✅ Admin session saved to ${ADMIN_SESSION_FILE}`);
});
