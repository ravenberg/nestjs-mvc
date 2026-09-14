import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'

interface Permutation {
  /** The app's directory (where its playwright.config.ts lives). */
  dir: string
  /** The port its dev server listens on; each app has its own, so they can run side by side. */
  port: number
  platform: 'express' | 'fastify'
}

/**
 * One Playwright config for every kitchen-sink permutation: the specs in this
 * directory, run against that app's dev server (Vite in-process, HMR, SSR on
 * the routes that opt in). A server already listening on the port is reused,
 * so `pnpm dev` in one terminal and `pnpm test:e2e` in another is the fast
 * loop; CI starts its own.
 */
export function kitchenSinkConfig({ dir, port, platform }: Permutation) {
  const baseURL = `http://localhost:${port}`
  // The logged-in browser state `auth.setup.ts` writes; per app, because the database is.
  const storageState = join(dir, '.auth/user.json')

  return defineConfig({
    testDir: fileURLToPath(new URL('.', import.meta.url)),
    outputDir: join(dir, 'test-results'),
    timeout: 30_000,
    expect: { timeout: 5_000 },
    fullyParallel: true,
    workers: process.env.CI ? 1 : 3,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [['list'], ['html', { open: 'never', outputFolder: join(dir, 'playwright-report') }]] : 'list',
    metadata: { platform, storageState },
    use: {
      baseURL,
      trace: 'retain-on-failure',
    },
    // The CRM needs a login: `setup` logs in once through the real form and every
    // spec starts from that state. auth.spec.ts starts logged out on purpose.
    projects: [
      { name: 'setup', testMatch: /.*\.setup\.ts/ },
      {
        name: 'chromium',
        use: { ...devices['Desktop Chrome'], storageState },
        dependencies: ['setup'],
      },
    ],
    webServer: {
      command: 'pnpm dev',
      cwd: dir,
      env: { PORT: String(port) },
      url: `${baseURL}/dashboard`,
      reuseExistingServer: true,
      timeout: 60_000,
    },
  })
}
