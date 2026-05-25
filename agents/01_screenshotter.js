#!/usr/bin/env node
'use strict';

/**
 * AGENT 1: SCREENSHOTTER
 *
 * Takes browser screenshots of every screen and interaction state
 * in the ScanBite application. Outputs PNGs + a manifest.json.
 *
 * Usage:
 *   node 01_screenshotter.js
 *   node 01_screenshotter.js --screen=admin-dashboard
 *   node 01_screenshotter.js --mode=verify   (post-enhancement re-run)
 */

const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const OUT_DIR = path.join(__dirname, 'output', 'screenshots');
const MANIFEST_PATH = path.join(__dirname, 'output', 'manifest.json');

const args = process.argv.slice(2);
const targetScreen = args.find(a => a.startsWith('--screen='))?.split('=')[1];
const isVerifyMode = args.includes('--mode=verify');

// ─── SCREEN DEFINITIONS ────────────────────────────────────────────────────

const SCREENS = [
  // ── Customer Layer (Mobile 390×844 — iPhone 14) ──────────────────────────
  {
    id: 'customer-menu',
    url: '/m/demo',
    viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true },
    states: ['default', 'scroll-halfway', 'category-active'],
    setup: async (page) => {
      // Set a demo session cookie
      await page.setCookie({ name: 'session_token', value: 'demo_token', domain: 'localhost' });
    },
  },
  {
    id: 'customer-item-detail',
    url: '/m/demo',
    viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true },
    states: ['item-sheet-open'],
    setup: async (page) => {
      await page.setCookie({ name: 'session_token', value: 'demo_token', domain: 'localhost' });
      // Click the first food card to open the detail sheet
      await page.waitForSelector('.food-card, .menu-hero', { timeout: 5000 }).catch(() => {});
      const card = await page.$('.food-card, .menu-hero');
      if (card) await card.click();
      await page.waitForTimeout(400);
    },
  },
  {
    id: 'customer-cart',
    url: '/m/demo',
    viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true },
    states: ['cart-open'],
    setup: async (page) => {
      await page.setCookie({ name: 'session_token', value: 'demo_token', domain: 'localhost' });
      await page.waitForSelector('.tabbar__item, .cust-icon-btn', { timeout: 5000 }).catch(() => {});
      // Try to open cart via icon button
      const cartBtn = await page.$('[aria-label="cart"], .cust-icon-btn');
      if (cartBtn) await cartBtn.click();
      await page.waitForTimeout(400);
    },
  },
  {
    id: 'customer-checkout',
    url: '/m/demo/checkout',
    viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true },
    states: ['default'],
    setup: async (page) => {
      await page.setCookie({ name: 'session_token', value: 'demo_token', domain: 'localhost' });
    },
  },
  {
    id: 'customer-tracking',
    url: '/m/demo/order/demo-order-id',
    viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true },
    states: ['preparing-state'],
    setup: async (page) => {
      await page.setCookie({ name: 'session_token', value: 'demo_token', domain: 'localhost' });
    },
  },

  // ── Auth Screens (Desktop 1440×900) ───────────────────────────────────────
  {
    id: 'admin-login',
    url: '/login',
    viewport: { width: 1440, height: 900 },
    states: ['default', 'filled', 'error'],
    setup: async (page, state) => {
      if (state === 'error') {
        await page.waitForSelector('input[type="email"]', { timeout: 3000 }).catch(() => {});
        await page.type('input[type="email"]', 'wrong@email.com').catch(() => {});
        await page.type('input[type="password"]', 'wrongpass').catch(() => {});
        const btn = await page.$('button[type="submit"]');
        if (btn) await btn.click();
        await page.waitForTimeout(800);
      }
    },
  },
  {
    id: 'chef-login',
    url: '/chef-login',
    viewport: { width: 1440, height: 900 },
    states: ['default'],
  },

  // ── Admin Dashboard (Desktop 1440×900) ────────────────────────────────────
  {
    id: 'admin-dashboard',
    url: '/dashboard',
    viewport: { width: 1440, height: 900 },
    states: ['default', 'hover-nav'],
    auth: 'admin',
    setup: async (page, state) => {
      if (state === 'hover-nav') {
        await page.waitForSelector('.adm-nav', { timeout: 3000 }).catch(() => {});
        const navItems = await page.$$('.adm-nav');
        if (navItems[1]) await navItems[1].hover();
        await page.waitForTimeout(200);
      }
    },
  },
  {
    id: 'admin-orders',
    url: '/dashboard/orders',
    viewport: { width: 1440, height: 900 },
    states: ['default', 'order-modal-open'],
    auth: 'admin',
    setup: async (page, state) => {
      if (state === 'order-modal-open') {
        await page.waitForSelector('.order-row, tr', { timeout: 3000 }).catch(() => {});
        const row = await page.$('.order-row, tr:not(:first-child)');
        if (row) await row.click();
        await page.waitForTimeout(400);
      }
    },
  },
  {
    id: 'admin-menu',
    url: '/dashboard/menu',
    viewport: { width: 1440, height: 900 },
    states: ['default'],
    auth: 'admin',
  },
  {
    id: 'admin-tables',
    url: '/dashboard/tables',
    viewport: { width: 1440, height: 900 },
    states: ['default'],
    auth: 'admin',
  },
  {
    id: 'admin-billing',
    url: '/dashboard/billing',
    viewport: { width: 1440, height: 900 },
    states: ['default'],
    auth: 'admin',
  },
  {
    id: 'admin-analytics',
    url: '/dashboard/analytics',
    viewport: { width: 1440, height: 900 },
    states: ['default'],
    auth: 'admin',
  },
  {
    id: 'admin-inventory',
    url: '/dashboard/inventory',
    viewport: { width: 1440, height: 900 },
    states: ['default'],
    auth: 'admin',
  },
  {
    id: 'admin-settings',
    url: '/dashboard/settings',
    viewport: { width: 1440, height: 900 },
    states: ['default'],
    auth: 'admin',
  },

  // ── KDS (Full-width 1920×1080) ────────────────────────────────────────────
  {
    id: 'kds-main',
    url: '/kds',
    viewport: { width: 1920, height: 1080 },
    states: ['default', 'orders-visible'],
    auth: 'chef',
  },

  // ── Onboarding ────────────────────────────────────────────────────────────
  {
    id: 'onboarding',
    url: '/onboarding',
    viewport: { width: 1440, height: 900 },
    states: ['default'],
    auth: 'admin',
  },
];

// ─── AUTH COOKIES ──────────────────────────────────────────────────────────

async function setAuthCookies(page, role) {
  // In a real setup, these would be real JWT tokens from a test account
  const tokens = {
    admin: process.env.TEST_ADMIN_JWT || 'test-admin-jwt',
    chef: process.env.TEST_CHEF_JWT || 'test-chef-jwt',
  };

  if (tokens[role]) {
    // NextAuth uses a session cookie
    await page.setCookie({
      name: 'next-auth.session-token',
      value: tokens[role],
      domain: 'localhost',
      path: '/',
    });
  }
}

// ─── SCREENSHOT HELPER ─────────────────────────────────────────────────────

async function screenshot(page, screen, state) {
  const filename = `${screen.id}--${state}.png`;
  const filepath = path.join(OUT_DIR, filename);

  await page.screenshot({
    path: filepath,
    fullPage: false,
    type: 'png',
  });

  console.log(`  ✓ ${filename}`);
  return { id: `${screen.id}--${state}`, filename, filepath };
}

// ─── MAIN ──────────────────────────────────────────────────────────────────

async function main() {
  await fs.ensureDir(OUT_DIR);

  const screensToRun = targetScreen
    ? SCREENS.filter(s => s.id === targetScreen)
    : SCREENS;

  if (!screensToRun.length) {
    console.error(`No screen found with id: ${targetScreen}`);
    process.exit(1);
  }

  console.log(`\n🔍 SCREENSHOTTER — ${isVerifyMode ? 'VERIFY MODE' : 'FULL RUN'}`);
  console.log(`App URL: ${APP_URL}`);
  console.log(`Screens: ${screensToRun.length}\n`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
  });

  const manifest = {
    timestamp: new Date().toISOString(),
    appUrl: APP_URL,
    mode: isVerifyMode ? 'verify' : 'full',
    screenshots: [],
  };

  for (const screen of screensToRun) {
    console.log(`📱 ${screen.id}`);

    for (const state of screen.states) {
      const page = await browser.newPage();

      try {
        await page.setViewport(screen.viewport);

        // Set auth cookies if needed
        if (screen.auth) {
          await setAuthCookies(page, screen.auth);
        }

        // Navigate to the page
        await page.goto(`${APP_URL}${screen.url}`, {
          waitUntil: 'networkidle2',
          timeout: 15000,
        });

        // Run setup for this specific state
        if (screen.setup) {
          await screen.setup(page, state);
        }

        // Wait for any animations to settle
        await new Promise(r => setTimeout(r, 600));

        // Take the screenshot
        const result = await screenshot(page, screen, state);

        manifest.screenshots.push({
          id: result.id,
          path: path.relative(__dirname, result.filepath).replace(/\\/g, '/'),
          url: screen.url,
          viewport: screen.viewport,
          state,
          screen: screen.id,
          auth: screen.auth || null,
        });

      } catch (err) {
        console.error(`  ✗ ${screen.id}--${state}: ${err.message}`);
        manifest.screenshots.push({
          id: `${screen.id}--${state}`,
          error: err.message,
          screen: screen.id,
          state,
        });
      } finally {
        await page.close();
      }
    }
  }

  await browser.close();

  // Save manifest
  await fs.writeJson(MANIFEST_PATH, manifest, { spaces: 2 });

  const success = manifest.screenshots.filter(s => !s.error).length;
  const failed = manifest.screenshots.filter(s => s.error).length;

  console.log(`\n✅ Screenshots complete: ${success} captured, ${failed} failed`);
  console.log(`📄 Manifest saved to: ${MANIFEST_PATH}`);

  if (failed > 0) {
    console.log('\n⚠️  Some screenshots failed. This usually means:');
    console.log('   1. The app is not running at ' + APP_URL);
    console.log('   2. Test auth tokens are not set in env');
    console.log('   3. The page routes have changed');
  }
}

main().catch(err => {
  console.error('Screenshotter crashed:', err);
  process.exit(1);
});
