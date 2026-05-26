import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = "http://localhost:3000";
const OUT = path.join(process.cwd(), "temporary screenshots", "phase2-audit-v2");
const ADMIN = { email: "admin@spicegarden.com", password: "admin123" };

fs.mkdirSync(OUT, { recursive: true });

const results = [];

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function test(name, fn) {
  try {
    await fn();
    results.push({ name, status: "PASS" });
  } catch (e) {
    results.push({ name, status: "FAIL", error: String(e.message || e) });
  }
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => consoleErrors.push(err.message));

await test("Admin login", async () => {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 60000 });
  await page.fill('input[type="email"]', ADMIN.email);
  await page.fill('input[type="password"]', ADMIN.password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard**", { timeout: 30000 });
});

await test("Menu preview renders customer UI", async () => {
  await page.goto(`${BASE}/dashboard/menu/preview`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(3000);
  const err = page.locator("text=Maximum update depth");
  if ((await err.count()) > 0) throw new Error("React infinite loop still present");
  const browse = page.getByText(/Browse fast/i);
  if ((await browse.count()) === 0) throw new Error("Customer menu not visible in preview");
  await shot(page, "01-preview-menu");
});

let qrUrl = null;
await test("Fetch QR token", async () => {
  const res = await page.request.get(`${BASE}/api/tables`);
  const json = await res.json();
  const tables = json.data ?? [];
  if (!tables.length) throw new Error("No tables");
  qrUrl = `${BASE}/m/spice-garden?t=${tables[0].qr_token}`;
});

await test("Customer menu loads via QR", async () => {
  if (!qrUrl) throw new Error("No QR URL");
  await page.goto(qrUrl, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2500);
  if ((await page.locator("text=Maximum update depth").count()) > 0) {
    throw new Error("Infinite loop on customer menu");
  }
  await shot(page, "02-customer-menu");
});

await test("ADD button adds to cart", async () => {
  const add = page.getByRole("button", { name: /ADD/i }).first();
  if ((await add.count()) === 0) throw new Error("No ADD buttons");
  await add.click();
  await page.waitForTimeout(800);
  const bag = page.getByText(/view bag/i);
  if ((await bag.count()) === 0) throw new Error("Cart bar did not appear");
  await shot(page, "03-after-add");
});

await test("Checkout page loads with items", async () => {
  await page.goto(`${BASE}/m/spice-garden/checkout`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1500);
  if ((await page.locator("text=Maximum update depth").count()) > 0) {
    throw new Error("Checkout crash");
  }
  if ((await page.getByText(/your bag is empty/i).count()) > 0) {
    throw new Error("Checkout shows empty cart");
  }
  await shot(page, "04-checkout");
});

await test("Place order flow", async () => {
  const placeBtn = page.getByRole("button", { name: /place order/i });
  if ((await placeBtn.count()) === 0) throw new Error("Place order button missing");
  await placeBtn.click();
  await page.waitForURL("**/order/**", { timeout: 30000 });
  await shot(page, "05-order-confirmation");
});

await browser.close();

const report = { tests: results, consoleErrors: [...new Set(consoleErrors)].slice(0, 15) };
fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
