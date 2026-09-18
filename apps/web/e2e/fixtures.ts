import { test as base, expect, type Locator, type Page } from '@playwright/test';

/**
 * Every test runs with a console watchdog attached.
 *
 * A page that works but logs errors, fails to load an asset, or leaves a
 * promise rejected is not actually clean, and those problems are exactly what
 * a manual click-through misses. Collected failures are asserted after each
 * test, so any test failing this way names the offending message.
 */
export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: async ({ page }, use) => {
    const errors: string[] = [];

    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(`console.error: ${message.text()}`);
    });
    page.on('pageerror', (error) => errors.push(`uncaught: ${error.message}`));
    page.on('requestfailed', (request) => {
      // Ignore aborts caused by navigation during teardown.
      const failure = request.failure()?.errorText ?? '';
      if (failure.includes('ERR_ABORTED')) return;
      errors.push(`request failed: ${request.url()} (${failure})`);
    });
    page.on('response', (response) => {
      if (response.status() >= 400) {
        errors.push(`HTTP ${response.status()}: ${response.url()}`);
      }
    });

    await use(errors);
  },
});

export { expect };

/** Assert the watchdog stayed quiet. Called at the end of each test. */
export function expectNoConsoleErrors(errors: string[]) {
  expect(errors, `Console/network errors:\n${errors.join('\n')}`).toEqual([]);
}

/**
 * Set a large value on a controlled field.
 *
 * Playwright's `fill()` becomes very slow on multi-kilobyte payloads in React
 * controlled inputs — slow enough to exceed the test timeout — while the app
 * itself handles the same input in well under a second. Setting the value
 * through the native setter and dispatching `input` is what React listens for,
 * so the component updates exactly as it would for a real paste.
 */
export async function pasteLargeValue(locator: Locator, value: string) {
  await locator.evaluate((el, text) => {
    const proto =
      el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    setter?.call(el, text);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}

/** Wait for the app shell to be interactive. */
export async function gotoAndSettle(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}
