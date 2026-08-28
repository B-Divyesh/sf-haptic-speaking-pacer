import { defineConfig, devices } from '@playwright/test';

const liveBaseUrl = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  use: { baseURL: liveBaseUrl ?? 'http://127.0.0.1:4173', trace: 'retain-on-failure' },
  webServer: liveBaseUrl ? undefined : { command: 'npm run preview', url: 'http://127.0.0.1:4173', reuseExistingServer: true },
  projects: [{ name: 'mobile-chromium', use: { ...devices['iPhone 13'], browserName: 'chromium' } }],
});
