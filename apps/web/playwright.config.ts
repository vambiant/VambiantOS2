import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 3,
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:6400',
    trace: 'off',
    screenshot: 'off',
    navigationTimeout: 30000,
    actionTimeout: 15000,
    video: 'off',
  },
  webServer: {
    command: 'npx next dev -p 6400',
    port: 6400,
    reuseExistingServer: true,
  },
});
