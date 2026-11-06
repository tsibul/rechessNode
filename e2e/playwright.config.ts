import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'

/**
 * End-to-end run against a production-like setup: the backend on a separate port, the site published by
 * the real PUBLISH_COMMAND into a temporary folder and served by support/serve.mjs (stands in for nginx).
 * Ports are not the dev ports 3000/3001, so a running dev server of the same project does not interfere.
 */
const SITE_PORT = Number(process.env.E2E_SITE_PORT || 3100)
const API_PORT = Number(process.env.E2E_API_PORT || 3101)
const tmp = path.resolve(__dirname, '.tmp')

export default defineConfig({
  testDir: './tests',
  globalSetup: './support/global-setup.ts',
  globalTeardown: './support/global-teardown.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 90_000,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${SITE_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], channel: 'chrome' },
      testMatch: /(purchase|routes|footer-dialog)\.spec\.ts/
    }
  ],
  webServer: [
    {
      command: 'npx ts-node src/index.ts',
      cwd: '../backend',
      url: `http://localhost:${API_PORT}/api/products`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        PORT: String(API_PORT),
        FRONTEND_URL: `http://localhost:${SITE_PORT}`,
        MAIL_OUTBOX_DIR: path.join(tmp, 'outbox'),
        UPLOAD_DIR: path.join(tmp, 'uploads'),
        SMTP_HOST: '',
        PAYMENT_PROVIDER: 'stub',
        PUBLISH_COMMAND: 'node ../frontend/scripts/publish.mjs',
        PUBLISH_TARGET: path.join(tmp, 'site'),
        API_URL: `http://localhost:${API_PORT}`,
        KEEP_RELEASES: '2'
      }
    },
    {
      command: 'node support/serve.mjs',
      url: `http://localhost:${SITE_PORT}/api/products`,
      reuseExistingServer: false,
      env: {
        E2E_SITE_PORT: String(SITE_PORT),
        E2E_API_URL: `http://localhost:${API_PORT}`,
        SITE_TARGET: path.join(tmp, 'site')
      }
    }
  ]
})
