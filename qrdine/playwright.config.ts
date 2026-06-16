import { defineConfig, devices } from '@playwright/test';

process.env.TEST_OTP_BYPASS = 'true';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html', { open: 'never', outputFolder: 'test-results/html-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  outputDir: 'test-results/artifacts',
  projects: [
    // Setup: sign in as admin once and save session to .playwright/admin-session.json
    {
      name: 'setup',
      testMatch: ['**/tests/global.setup.ts'],
    },

    // Auth tests — full auth flow coverage (UI + API), always unauthenticated
    {
      name: 'auth-tests',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        storageState: { cookies: [], origins: [] },
      },
      testMatch: ['**/tests/auth/**/*.spec.ts'],
      dependencies: ['setup'],
    },

    // API tests — no UI, uses APIRequestContext; clear cookies so auth-guard tests are unauthenticated
    {
      name: 'api-tests',
      use: {
        ...devices['Desktop Chrome'],
        storageState: { cookies: [], origins: [] },
      },
      testMatch: ['**/tests/api/**/*.spec.ts'],
      dependencies: ['setup'],
    },

    // Security tests — always unauthenticated
    {
      name: 'security-tests',
      use: {
        ...devices['Desktop Chrome'],
        storageState: { cookies: [], origins: [] },
      },
      testMatch: ['**/tests/security/**/*.spec.ts'],
      dependencies: ['setup'],
    },

    // Admin desktop — pre-authenticated via saved storageState
    {
      name: 'admin-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        storageState: '.playwright/admin-session.json',
      },
      testMatch: ['**/tests/admin/**/*.spec.ts'],
      dependencies: ['setup'],
    },

    // Customer mobile
    {
      name: 'customer-mobile',
      use: { ...devices['Pixel 7'] },
      testMatch: ['**/tests/customer/**/*.spec.ts'],
      dependencies: ['setup'],
    },

    // Chef KDS tablet
    {
      name: 'chef-tablet',
      use: {
        ...devices['iPad Pro 11'],
        viewport: { width: 1194, height: 834 },
        storageState: { cookies: [], origins: [] },
      },
      testMatch: ['**/tests/chef/**/*.spec.ts'],
      dependencies: ['setup'],
    },

    // Real-time Socket.IO event tests
    {
      name: 'realtime-tests',
      use: { ...devices['Desktop Chrome'] },
      testMatch: ['**/tests/realtime/**/*.spec.ts'],
      dependencies: ['setup'],
    },

    // Design compliance — runs against each surface
    {
      name: 'design-compliance',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        storageState: '.playwright/admin-session.json',
      },
      testMatch: ['**/tests/design/**/*.spec.ts'],
      dependencies: ['setup'],
    },

    // Edge cases & regression
    {
      name: 'edge-cases',
      use: { ...devices['Desktop Chrome'] },
      testMatch: ['**/tests/edge-cases/**/*.spec.ts'],
      dependencies: ['setup'],
    },

    // Integration tests (rate-limit, oversell, idempotency)
    {
      name: 'integration-tests',
      use: {
        ...devices['Desktop Chrome'],
        storageState: { cookies: [], origins: [] },
      },
      testMatch: ['**/tests/integration/**/*.spec.ts'],
      dependencies: ['setup'],
    },

    // Unit tests — pure function tests (no browser, no server needed)
    {
      name: 'unit-tests',
      use: { ...devices['Desktop Chrome'] },
      testMatch: ['**/tests/unit/**/*.spec.ts'],
    },
  ],
  webServer: {
    command: process.env.CI
      ? 'pnpm build && HOSTNAME=0.0.0.0 PORT=3000 node .next/standalone/server.js'
      : 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
