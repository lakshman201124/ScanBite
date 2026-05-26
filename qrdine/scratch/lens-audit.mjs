/**
 * LENS — Dashboard Browser Audit Script
 * Captures screenshots of all dashboard states for audit.
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "fs";

const BASE = "http://localhost:3000";
const OUT  = "./scratch/lens-screenshots";
mkdirSync(OUT, { recursive: true });

const CREDS = { email: "admin@spicegarden.com", password: "admin123" };

async function shot(page, name) {
  await page.screenshot({
    path: `${OUT}/${name}.png`,
    fullPage: true,
  });
  console.log(`📸  ${name}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx     = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page    = await ctx.newPage();

  // ── 1. Login page ──────────────────────────────────────
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await shot(page, "01-login-desktop");

  // ── 2. Attempt login ───────────────────────────────────
  try {
    // Use visible locators for the form inputs
    await page.locator('input[name="email"], input[type="email"], input[placeholder*="admin"]').first().fill(CREDS.email);
    await page.locator('input[name="password"], input[type="password"]').first().fill(CREDS.password);
    await page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")').first().click();
    await page.waitForURL("**/dashboard**", { timeout: 12000 });
    console.log("✅  Logged in");
  } catch {
    console.log("⚠️  Login failed or redirected — checking current URL:", page.url());
    await shot(page, "02-login-error");
    await browser.close();
    process.exit(0);
  }

  // ── 3. Dashboard home ───────────────────────────────────
  await page.waitForLoadState("networkidle");
  await shot(page, "03-dashboard-home");

  // Mobile viewport
  await page.setViewportSize({ width: 375, height: 812 });
  await page.reload({ waitUntil: "networkidle" });
  await shot(page, "04-dashboard-home-mobile");

  // ── 4. Orders page ─────────────────────────────────────
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE}/dashboard/orders`, { waitUntil: "networkidle" });
  await shot(page, "05-orders-desktop");

  await page.setViewportSize({ width: 375, height: 812 });
  await page.reload({ waitUntil: "networkidle" });
  await shot(page, "06-orders-mobile");

  // ── 5. Menu management ─────────────────────────────────
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE}/dashboard/menu`, { waitUntil: "networkidle" });
  await shot(page, "07-menu-desktop");

  // ── 6. Tables ──────────────────────────────────────────
  await page.goto(`${BASE}/dashboard/tables`, { waitUntil: "networkidle" });
  await shot(page, "08-tables-desktop");

  // ── 7. Billing ─────────────────────────────────────────
  await page.goto(`${BASE}/dashboard/billing`, { waitUntil: "networkidle" });
  await shot(page, "09-billing-desktop");

  // ── 8. Analytics ───────────────────────────────────────
  await page.goto(`${BASE}/dashboard/analytics`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000); // let charts render
  await shot(page, "10-analytics-desktop");

  // ── 9. Settings ────────────────────────────────────────
  await page.goto(`${BASE}/dashboard/settings`, { waitUntil: "networkidle" });
  await shot(page, "11-settings-desktop");

  // ── 10. Sidebar navigation (hover states) ──────────────
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot(page, "12-sidebar-full");

  await browser.close();
  console.log("\n🎉  LENS capture complete →", OUT);
})();
