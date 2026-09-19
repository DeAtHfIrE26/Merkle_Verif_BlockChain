import { test, expect, expectNoConsoleErrors, gotoAndSettle } from './fixtures';

const PATHS = ['/', '/merkle', '/signatures', '/transfers', '/about'];

/**
 * Layout guards. The specific thing these catch is horizontal overflow, which
 * is the usual way a hash-heavy UI breaks on a narrow phone.
 */
test.describe('responsive layout', () => {
  for (const width of [360, 768, 1280]) {
    test(`no horizontal overflow at ${width}px`, async ({ page, consoleErrors }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const path of PATHS) {
        await gotoAndSettle(page, path);
        if (path === '/signatures') {
          await expect(page.getByRole('button', { name: /Sign message/i })).toBeEnabled();
        }
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, `${path} overflows horizontally at ${page.viewportSize()?.width}px`).toBeLessThanOrEqual(1);
      }
      expectNoConsoleErrors(consoleErrors);
    });
  }
});

test.describe('mobile navigation', () => {
  test('the menu button opens and closes the nav', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await gotoAndSettle(page, '/');

    const toggle = page.getByRole('button', { name: /Open menu/i });
    await expect(toggle).toBeVisible();
    await toggle.click();

    const menu = page.locator('#mobile-menu');
    await expect(menu).toBeVisible();
    await menu.getByRole('link', { name: 'Signatures' }).click();
    await expect(page).toHaveURL(/\/signatures\/?$/);
  });
});

test.describe('accessibility basics', () => {
  for (const path of PATHS) {
    test(`${path} has one h1, a main landmark and labelled controls`, async ({ page }) => {
      await gotoAndSettle(page, path);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('main#main')).toHaveCount(1);

      // Every input, textarea and select must have an accessible name.
      const unlabelled = await page.evaluate(() => {
        const fields = Array.from(document.querySelectorAll('input, textarea, select'));
        return fields
          .filter((el) => {
            if (el.getAttribute('type') === 'radio') return false;
            const id = el.getAttribute('id');
            const hasLabel = id ? Boolean(document.querySelector(`label[for="${id}"]`)) : false;
            return !hasLabel && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby');
          })
          .map((el) => el.outerHTML.slice(0, 80));
      });
      expect(unlabelled, `Unlabelled form controls on ${path}`).toEqual([]);
    });
  }

  test('images and svg roles carry accessible names', async ({ page }) => {
    await gotoAndSettle(page, '/merkle');
    const missingAlt = await page.evaluate(() =>
      Array.from(document.querySelectorAll('img'))
        .filter((img) => !img.hasAttribute('alt'))
        .map((img) => img.outerHTML.slice(0, 80)),
    );
    expect(missingAlt).toEqual([]);
    await expect(page.getByRole('img', { name: /Merkle tree/i })).toBeVisible();
  });
});
