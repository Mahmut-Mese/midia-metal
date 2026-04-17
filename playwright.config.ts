import { defineConfig } from '@playwright/test';

const ASTRO_SERVER_LOG = '/tmp/midia-astro-playwright.log';

export default defineConfig({
  testDir: './tests',
  timeout: 600000,
  // Run tests sequentially to avoid hitting the backend rate limiter (throttle:5,1 on login endpoints)
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4323',
    headless: true,
  },
  webServer: {
    command: `rm -f ${ASTRO_SERVER_LOG} && rm -rf node_modules/.vite && PUBLIC_API_URL=http://127.0.0.1:8000/api npm run dev -- --host 127.0.0.1 --port 4323 > ${ASTRO_SERVER_LOG} 2>&1`,
    url: 'http://127.0.0.1:4323',
    reuseExistingServer: true,
    timeout: 60000,
  },
});
