import { defineConfig, devices } from '@playwright/test'

/**
 * Regression suite for the kitchen-sink demo. Runs against the dev server
 * (Vite in-process, HMR, SSR on the routes that opt in), which is the
 * configuration the demo is developed in. A server already listening on
 * :3000 is reused, so `pnpm dev` in one terminal and `pnpm test:e2e` in
 * another is the fast loop; CI starts its own.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  workers: process.env.CI ? 1 : 3,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  // The CRM needs a login: `setup` logs in once through the real form and every
  // spec starts from that state. auth.spec.ts starts logged out on purpose.
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/user.json' },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000/dashboard',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
