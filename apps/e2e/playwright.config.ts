import path from 'node:path';

import { defineConfig, devices } from '@playwright/test';

const repoRoot = path.resolve(__dirname, '../..');

export const FRONTEND_URL = 'http://localhost:4200';
export const BACKEND_URL = 'http://localhost:3000';
export const MAILPIT_URL = 'http://localhost:8025';

export const AUTH_THROTTLE_TTL_MS = 1000;
export const AUTH_THROTTLE_LIMIT = 50;

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: FRONTEND_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter backend start',
      cwd: repoRoot,
      url: `${BACKEND_URL}/`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        AUTH_THROTTLE_TTL_MS: String(AUTH_THROTTLE_TTL_MS),
        AUTH_THROTTLE_LIMIT: String(AUTH_THROTTLE_LIMIT),
      },
    },
    {
      command: 'pnpm --filter frontend start',
      cwd: repoRoot,
      url: FRONTEND_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
