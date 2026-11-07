import { defineConfig, devices } from '@playwright/test';

// Browser tests run against the exported `out/` artifact, never `next dev`.
// Run `npm run build` first (or `npm run test:e2e`, which builds and then runs).
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4178',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node scripts/serve-static.mjs',
    url: 'http://127.0.0.1:4178/login',
    reuseExistingServer: false,
    timeout: 30_000,
    env: { PORT: '4178', HOST: '127.0.0.1' },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
