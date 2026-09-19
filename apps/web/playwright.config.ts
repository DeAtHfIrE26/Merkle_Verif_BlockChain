import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

/**
 * E2E configuration.
 *
 * BASE_URL lets the same suite run against the local dev build and against the
 * deployed site, which is how the production deployment gets verified rather
 * than assumed. When BASE_URL is set, no local server is started.
 *
 * Some sandboxes ship a preinstalled Chromium whose build number does not match
 * the pinned @playwright/test. Where that build exists we point at it directly;
 * everywhere else Playwright manages its own browsers as usual.
 */

const PREINSTALLED_CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const launchOptions = existsSync(PREINSTALLED_CHROMIUM)
  ? { executablePath: PREINSTALLED_CHROMIUM }
  : {};
// A trailing slash is load-bearing. Playwright resolves a relative goto() with
// `new URL(path, baseURL)`, and without it the last path segment is treated as a
// filename and dropped -- so a subpath deployment such as
// https://user.github.io/Repo would silently be tested at the domain root.
const rawBaseURL = process.env.BASE_URL ?? 'http://127.0.0.1:3100';
const baseURL = rawBaseURL.endsWith('/') ? rawBaseURL : `${rawBaseURL}/`;
const isRemote = Boolean(process.env.BASE_URL);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  ...(isRemote
    ? {}
    : {
        webServer: {
          command: 'npm run start -- --port 3100',
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      }),
});
