import { defineConfig } from '@playwright/test';

const requestedUrl = process.env.DESIGN_LAB_TEST_URL;
const baseURL = requestedUrl ?? 'http://127.0.0.1:5186';
if (!['localhost', '127.0.0.1'].includes(new URL(baseURL).hostname)) throw new Error('Browser tests require a local project URL.');
export default defineConfig({
  testDir: './tests/browser',
  workers: 1,
  reporter: 'list',
  outputDir: '.checks/playwright',
  use: { baseURL, viewport: { width: 1440, height: 1024 }, locale: 'ru-RU', reducedMotion: 'reduce', headless: true, launchOptions: { args: ['--no-sandbox', '--disable-dev-shm-usage'] } },
  webServer: requestedUrl ? undefined : { command: 'npm run dev -- --port 5186', url: baseURL, reuseExistingServer: false, timeout: 30_000 },
});
