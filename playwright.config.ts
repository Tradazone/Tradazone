import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir:     './e2e',
  fullyParallel: true,
  forbidOnly:  !!process.env.CI,
  retries:     process.env.CI ? 2 : 0,
  workers:     process.env.CI ? 1 : undefined,

  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],

  use: {
    baseURL:           'http://localhost:5173',
    trace:             'on-first-retry',
    screenshot:        'only-on-failure',
    video:             'retain-on-failure',
    actionTimeout:     10_000,
    navigationTimeout: 15_000,
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
  ],

  // Start the dev server before tests run
  webServer: {
    command:           'npm run dev',
    url:               'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout:           30_000,
  },
});
