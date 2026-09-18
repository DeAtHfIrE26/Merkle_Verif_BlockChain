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
