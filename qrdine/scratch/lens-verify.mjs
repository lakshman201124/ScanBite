import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE = "http://localhost:3000";
const OUT  = "./scratch/lens-screenshots";
mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx     = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page    = await ctx.newPage();

  // Login
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.locator('input[type="email"]').first().fill("admin@spicegarden.com");
  await page.locator('input[type="password"]').first().fill("admin123");
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL("**/dashboard**", { timeout: 12000 });
  console.log("✅ Logged in");

  // Dashboard — check chart
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${OUT}/v2-dashboard.png`, fullPage: false });
  console.log("📸 v2-dashboard");

  // New order page
  await page.goto(`${BASE}/dashboard/orders/new`, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${OUT}/v2-new-order.png`, fullPage: true });
  console.log("📸 v2-new-order");

  await browser.close();
  console.log("🎉 Done");
})();
