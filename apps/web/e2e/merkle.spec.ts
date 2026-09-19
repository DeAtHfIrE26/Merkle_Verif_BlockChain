import {
  test,
  expect,
  expectNoConsoleErrors,
  gotoAndSettle,
  pasteLargeValue,
} from './fixtures';

test.describe('Merkle Proof Explorer', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAndSettle(page, '/merkle');
  });

  test('loads with sample data already verifying', async ({ page, consoleErrors }) => {
    await expect(page.getByRole('status')).toContainText(/Valid/i);
    await expect(page.getByText(/8 leaves/i).first()).toBeVisible();
    expectNoConsoleErrors(consoleErrors);
  });

  test('tampering with the proof flips the verdict, restoring flips it back', async ({
    page,
    consoleErrors,
  }) => {
    const verdict = page.getByRole('status');
    await expect(verdict).toContainText(/Valid/i);

    await page.getByRole('button', { name: /Tamper with it/i }).click();
    await expect(verdict).toContainText(/Invalid/i);
    await expect(verdict).toContainText(/Computed root/i);

    await page.getByRole('button', { name: /Restore proof/i }).click();
    await expect(verdict).toContainText(/Valid/i);
    expectNoConsoleErrors(consoleErrors);
  });

  test('editing the proof by hand invalidates it', async ({ page }) => {
    const proof = page.getByLabel(/Proof elements/i);
    await proof.fill('0xdeadbeef');
    await expect(page.getByRole('status')).toContainText(/Invalid/i);
  });

  test('stepping through leaves keeps every proof valid', async ({ page, consoleErrors }) => {
    const next = page.getByRole('button', { name: 'Next leaf' });
    for (let i = 0; i < 7; i += 1) {
      await next.click();
      await expect(page.getByRole('status')).toContainText(/Valid/i);
    }
    await expect(next).toBeDisabled();
    expectNoConsoleErrors(consoleErrors);
  });

  test('custom values build a tree that verifies', async ({ page, consoleErrors }) => {
    await page.getByLabel('Values').fill('alice\nbob\ncarol\ndave\nerin');
    await expect(page.getByText(/5 leaves/i).first()).toBeVisible();
    await expect(page.getByRole('status')).toContainText(/Valid/i);
    expectNoConsoleErrors(consoleErrors);
  });

  test('a single leaf is its own root with an empty proof', async ({ page }) => {
    await page.getByLabel('Values').fill('only-one');
    await expect(page.getByText(/the leaf .*is.* the root/i)).toBeVisible();
  });

  test('clearing the input shows the empty state, which can reload the sample', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Clear' }).click();
    await expect(page.getByRole('heading', { name: /No tree yet/i })).toBeVisible();
    await page.getByRole('button', { name: /Load sample data/i }).click();
    await expect(page.getByRole('status')).toContainText(/Valid/i);
  });

  test('unicode and very long values are accepted', async ({ page, consoleErrors }) => {
    await page.getByLabel('Values').fill(`🚀 rocket\n日本語のテキスト\n${'x'.repeat(2000)}`);
    await expect(page.getByText(/3 leaves/i).first()).toBeVisible();
    await expect(page.getByRole('status')).toContainText(/Valid/i);
    expectNoConsoleErrors(consoleErrors);
  });

  test('an over-large input is refused with an explanation', async ({ page }) => {
    const many = Array.from({ length: 4097 }, (_, i) => `v${i}`).join('\n');
    await pasteLargeValue(page.getByLabel('Values'), many);
    await expect(page.getByRole('alert').first()).toContainText(/caps at/i);
    await expect(page.getByRole('alert').first()).toContainText('4,097');
  });

  test('leaves are selectable by keyboard', async ({ page }) => {
    const leaf = page.getByRole('button', { name: 'Select leaf 3' });
    await leaf.focus();
    await leaf.press('Enter');
    await expect(page.getByText('Leaf 3 of 8')).toBeVisible();
  });

  test('rapid clicking the tamper toggle settles correctly', async ({ page, consoleErrors }) => {
    for (let i = 0; i < 5; i += 1) {
      await page.getByRole('button', { name: /Tamper with it/i }).click();
      await page.getByRole('button', { name: /Restore proof/i }).click();
    }
    await expect(page.getByRole('status')).toContainText(/Valid/i);
    expectNoConsoleErrors(consoleErrors);
  });

  test('a refresh mid-flow returns to a working default', async ({ page }) => {
    await page.getByRole('button', { name: /Tamper with it/i }).click();
    await expect(page.getByRole('status')).toContainText(/Invalid/i);
    await page.reload();
    await expect(page.getByRole('status')).toContainText(/Valid/i);
  });
});

/**
 * Leaf encoding, sharing and export.
 *
 * These three exist so the Explorer can serve someone holding a real allowlist,
 * not only someone learning what a proof is. The OpenZeppelin root asserted
 * below is the one `@openzeppelin/merkle-tree` produces for the sample
 * allowlist -- `packages/core/src/leaves.test.ts` pins that parity at the unit
 * level, and this checks the UI actually surfaces it.
 */
test.describe('Merkle Proof Explorer — encodings', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAndSettle(page, '/merkle');
  });

  /**
   * The full root. HexValue truncates what it shows but puts the whole value in
   * the title, so reading that avoids asserting on an abbreviation.
   */
  const readRoot = async (page: import('@playwright/test').Page) => {
    const title = await page.locator('[title^="Merkle root:"]').first().getAttribute('title');
    const match = /0x[0-9a-f]{64}/i.exec(title ?? '');
    expect(match, `no root in title: ${title}`).not.toBeNull();
    return match![0];
  };

  test('switching encoding swaps in sample data that fits it', async ({ page }) => {
    const values = page.getByLabel(/^Values$/i);
    await expect(values).toHaveValue(/0xe81aa9d7/);

    await page.getByRole('radio', { name: /OpenZeppelin standard/i }).check();
    // The tx-hash sample cannot parse as address/amount, so it is replaced.
    await expect(values).toHaveValue(/0xA1b2C3d4/);
    await expect(page.getByRole('status')).toContainText(/Valid/i);
  });

  test('each encoding produces a different root for the same allowlist', async ({
    page,
    consoleErrors,
  }) => {
    await page.getByRole('radio', { name: /Packed/i }).check();
    await expect(page.getByRole('status')).toContainText(/Valid/i);
    const packedRoot = await readRoot(page);

    await page.getByRole('radio', { name: /OpenZeppelin standard/i }).check();
    await expect(page.getByRole('status')).toContainText(/Valid/i);
    const standardRoot = await readRoot(page);

    expect(standardRoot).not.toBe(packedRoot);
    expectNoConsoleErrors(consoleErrors);
  });

  test('a malformed allowlist line is reported with its line number', async ({ page }) => {
    await page.getByRole('radio', { name: /Packed/i }).check();
    await page.getByLabel(/^Values$/i).fill('0xnot-an-address, 5');
    await expect(page.getByText(/Line 1/i)).toBeVisible();
  });

  test('the standard encoding says it reorders leaves', async ({ page }) => {
    await page.getByRole('radio', { name: /OpenZeppelin standard/i }).check();
    await expect(page.getByText(/ordered by hash, not by line/i)).toBeVisible();
  });

  test('every leaf still verifies under the standard encoding', async ({ page }) => {
    await page.getByRole('radio', { name: /OpenZeppelin standard/i }).check();
    const next = page.getByRole('button', { name: 'Next leaf' });
    for (let i = 0; i < 4; i += 1) {
      await next.click();
      await expect(page.getByRole('status')).toContainText(/Valid/i);
    }
  });
});

test.describe('Merkle Proof Explorer — sharing and export', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await gotoAndSettle(page, '/merkle');
  });

  test('a shared link restores the values, encoding and selected leaf', async ({
    page,
    consoleErrors,
  }) => {
    await page.getByRole('radio', { name: /OpenZeppelin standard/i }).check();
    await page.getByRole('button', { name: 'Next leaf' }).click();
    await page.getByRole('button', { name: /Share this tree/i }).click();
    await expect(page.getByRole('button', { name: /Link copied/i })).toBeVisible();

    const shared = await page.evaluate(() => navigator.clipboard.readText());
    expect(shared).toContain('e=standard');
    expect(shared).toContain('i=1');

    // Land on the link in a clean page and confirm it rebuilds the same tree.
    await page.goto('about:blank');
    await page.goto(shared);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('radio', { name: /OpenZeppelin standard/i })).toBeChecked();
    await expect(page.getByLabel(/^Values$/i)).toHaveValue(/0xA1b2C3d4/);
    await expect(page.getByText(/Leaf 1 of/i)).toBeVisible();
    await expect(page.getByRole('status')).toContainText(/Valid/i);
    expectNoConsoleErrors(consoleErrors);
  });

  test('a hand-mangled link falls back to defaults rather than breaking', async ({
    page,
    consoleErrors,
  }) => {
    await gotoAndSettle(page, '/merkle?v=%%%not-base64%%%&e=nonsense&i=-4');
    await expect(page.getByRole('status')).toContainText(/Valid/i);
    await expect(page.getByRole('radio', { name: /Raw value/i })).toBeChecked();
    expectNoConsoleErrors(consoleErrors);
  });

  test('copy proof puts a JSON array of the sibling hashes on the clipboard', async ({ page }) => {
    await page.getByRole('button', { name: /Copy proof/i }).click();
    await expect(page.getByRole('button', { name: /^Copied$/i })).toBeVisible();

    const copied = await page.evaluate(() => navigator.clipboard.readText());
    const parsed = JSON.parse(copied) as string[];
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);
    for (const element of parsed) expect(element).toMatch(/^0x[0-9a-f]{64}$/);
  });
});
