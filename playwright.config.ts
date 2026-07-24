import { resolve } from 'node:path';
import { defineConfig } from '@playwright/test';

const PLAYWRIGHT_ARTIFACT_ROOT = resolve('.artifacts/playwright');
const PLAYWRIGHT_PORT = 4174;
const PLAYWRIGHT_BASE_URL = `http://127.0.0.1:${PLAYWRIGHT_PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  outputDir: resolve(PLAYWRIGHT_ARTIFACT_ROOT, 'test-results'),
  reporter: [
    ['list'],
    [
      'html',
      {
        outputFolder: resolve(PLAYWRIGHT_ARTIFACT_ROOT, 'report'),
        open: 'never',
      },
    ],
  ],
  use: {
    baseURL: PLAYWRIGHT_BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    launchOptions: {
      downloadsPath: resolve(PLAYWRIGHT_ARTIFACT_ROOT, 'downloads'),
    },
  },
  projects: [
    {
      name: 'chrome',
      use: { channel: 'chrome' },
    },
    {
      name: 'msedge',
      use: { channel: 'msedge' },
    },
  ],
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${PLAYWRIGHT_PORT} --strictPort`,
    url: PLAYWRIGHT_BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
