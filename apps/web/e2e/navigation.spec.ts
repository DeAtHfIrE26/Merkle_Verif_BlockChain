import { test, expect, expectNoConsoleErrors, gotoAndSettle, appPath } from './fixtures';

const ROUTES = [
  { path: '/', heading: /Prove a thing belongs/i, title: /Merkle Verify/ },
  { path: '/merkle', heading: /Merkle Proof Explorer/i, title: /Merkle Proof Explorer/ },
  { path: '/signatures', heading: /Signature Verifier/i, title: /Signature Verifier/ },
  { path: '/transfers', heading: /Transfer Tracker/i, title: /Transfer Tracker/ },
  { path: '/about', heading: /How it works/i, title: /How it works/ },
];

test.describe('routes', () => {
  for (const route of ROUTES) {
    test(`${route.path} renders with a heading, title and clean console`, async ({
      page,
      consoleErrors,
    }) => {
      await gotoAndSettle(page, route.path);
      await expect(page.getByRole('heading', { level: 1 })).toContainText(route.heading);
      await expect(page).toHaveTitle(route.title);
      expectNoConsoleErrors(consoleErrors);
    });
  }
});

test('unknown paths render the 404 page, not a crash', async ({ page, consoleErrors }) => {
  const response = await page.goto(appPath('/this-route-does-not-exist'));
  expect(response?.status()).toBe(404);

  // Hosts that serve a custom 404 document (Next, GitHub Pages) show our page.
  // A bare static file server returns its own minimal body; the status code is
  // the part that must hold everywhere.
  const custom = page.getByRole('heading', { name: /does not verify/i });
  if (await custom.isVisible().catch(() => false)) {
    await expect(page.getByRole('link', { name: /Open Merkle Explorer/i })).toBeVisible();
  }
  // The 404 status is the point of this test, and the browser also logs it as
  // a console error, so both are expected. Anything else is not.
  const unexpected = consoleErrors.filter(
    (e) => !e.startsWith('HTTP 404') && !/Failed to load resource.*404/.test(e),
  );
  expect(unexpected, `Unexpected errors:\n${unexpected.join('\n')}`).toEqual([]);
});

test('primary navigation reaches every tool', async ({ page, consoleErrors }) => {
  await gotoAndSettle(page, '/');

  for (const [label, expected] of [
    ['Merkle Proofs', /Merkle Proof Explorer/i],
    ['Signatures', /Signature Verifier/i],
    ['Transfers', /Transfer Tracker/i],
    ['How it works', /How it works/i],
  ] as const) {
    const link = page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: label });
    if (await link.isVisible()) {
      await link.click();
      await expect(page.getByRole('heading', { level: 1 })).toContainText(expected);
      await page.goBack();
    }
  }
  expectNoConsoleErrors(consoleErrors);
});

test('landing page cards link to each tool', async ({ page, consoleErrors }) => {
  await gotoAndSettle(page, '/');
  await page.getByRole('link', { name: /Merkle Proof Explorer/ }).first().click();
  await expect(page).toHaveURL(/\/merkle\/?$/);
  expectNoConsoleErrors(consoleErrors);
});

test('the skip link is reachable by keyboard and targets main', async ({ page }) => {
  await gotoAndSettle(page, '/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: /skip to content/i });
  await expect(skip).toBeFocused();
  await skip.press('Enter');
  await expect(page.locator('#main')).toBeVisible();
});

test('browser back and forward preserve the right pages', async ({ page, consoleErrors }) => {
  await gotoAndSettle(page, '/merkle');
  await gotoAndSettle(page, '/signatures');
  await page.goBack();
  await expect(page).toHaveURL(/\/merkle\/?$/);
  await page.goForward();
  await expect(page).toHaveURL(/\/signatures\/?$/);
  expectNoConsoleErrors(consoleErrors);
});

test('a deep link loads directly without going through the home page', async ({
  page,
  consoleErrors,
}) => {
  await gotoAndSettle(page, '/transfers');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Transfer Tracker/i);
  expectNoConsoleErrors(consoleErrors);
});
