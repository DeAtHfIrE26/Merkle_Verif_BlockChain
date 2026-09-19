import { test, expect, expectNoConsoleErrors, gotoAndSettle } from './fixtures';

test.describe('Signature Verifier', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAndSettle(page, '/signatures');
    // Client-only component: wait for the burner key to appear.
    await expect(page.getByRole('button', { name: /Sign message/i })).toBeEnabled();
  });

  test('signs and verifies a message end to end', async ({ page, consoleErrors }) => {
    await page.getByRole('button', { name: /Sign message/i }).click();
    await expect(page.getByLabel(/Signature \(65 bytes\)/i)).not.toHaveValue('');

    await page.getByRole('button', { name: /Verify signature/i }).click();
    await expect(page.getByRole('status')).toContainText(/Valid/i);
    await expect(page.getByRole('status')).toContainText(/recovered the expected signer/i);
    expectNoConsoleErrors(consoleErrors);
  });

  test('shows all three component checks passing for a real signature', async ({ page }) => {
    await page.getByRole('button', { name: /Sign message/i }).click();
    // The badges live in the Components box; '65 bytes' also appears in the
    // textarea label, so scope to the badge list.
    const checks = page.getByRole('listitem').filter({ hasText: /65 bytes|low-s|v = / });
    await expect(checks).toHaveCount(3);
    await expect(page.getByText(/low-s \(EIP-2\)/)).toBeVisible();
  });

  test('verifying under the wrong mode fails — the inherited bug', async ({
    page,
    consoleErrors,
  }) => {
    // Sign with the EIP-191 prefix…
    await page.getByRole('button', { name: /Sign message/i }).click();
    // …then verify as a raw digest.
    await page.getByRole('radio', { name: /Raw digest/i }).last().check();
    await page.getByRole('button', { name: /Verify signature/i }).click();

    await expect(page.getByRole('status')).toContainText(/Invalid/i);
    await expect(page.getByText(/Why the mode matters/i)).toBeVisible();
    await expect(page.getByText(/matches signer/i)).toBeVisible();
    expectNoConsoleErrors(consoleErrors);
  });

  test('raw signing verifies under raw mode', async ({ page }) => {
    await page.getByRole('radio', { name: /Raw digest/i }).first().check();
    await page.getByRole('button', { name: /Sign message/i }).click();
    await page.getByRole('radio', { name: /Raw digest/i }).last().check();
    await page.getByRole('button', { name: /Verify signature/i }).click();
    await expect(page.getByRole('status')).toContainText(/Valid/i);
  });

  test('a different expected signer is rejected with a reason', async ({ page }) => {
    await page.getByRole('button', { name: /Sign message/i }).click();
    await page.getByLabel(/Expected signer/i).fill(`0x${'11'.repeat(20)}`);
    await page.getByRole('button', { name: /Verify signature/i }).click();
    await expect(page.getByRole('status')).toContainText(/does not match/i);
  });

  test('a malformed signature is caught before verification', async ({ page }) => {
    await page.getByLabel(/Signature \(65 bytes\)/i).fill('0xdeadbeef');
    await expect(page.getByRole('alert').first()).toContainText(/exactly 65 bytes/i);
  });

  test('changing the message invalidates the old signature', async ({ page }) => {
    await page.getByRole('button', { name: /Sign message/i }).click();
    await page.getByRole('button', { name: /Verify signature/i }).click();
    await expect(page.getByRole('status')).toContainText(/Valid/i);

    await page.getByLabel('Message', { exact: true }).fill('A completely different message');
    await page.getByRole('button', { name: /Verify signature/i }).click();
    await expect(page.getByRole('status')).toContainText(/Invalid/i);
  });

  test('a new burner key produces a different address', async ({ page, consoleErrors }) => {
    const address = page.getByRole('button', { name: /Copy Signer address/i });
    const before = await address.getAttribute('aria-label');
    await page.getByRole('button', { name: /New burner key/i }).click();
    await expect(address).not.toHaveAttribute('aria-label', before ?? '');
    expectNoConsoleErrors(consoleErrors);
  });

  test('an empty message still hashes and signs', async ({ page }) => {
    await page.getByLabel('Message', { exact: true }).fill('');
    await page.getByRole('button', { name: /Sign message/i }).click();
    await page.getByRole('button', { name: /Verify signature/i }).click();
    await expect(page.getByRole('status')).toContainText(/Valid/i);
  });

  test('double-submitting verify does not break the result', async ({ page, consoleErrors }) => {
    await page.getByRole('button', { name: /Sign message/i }).click();
    const verify = page.getByRole('button', { name: /Verify signature/i });
    await verify.click();
    await verify.click();
    await expect(page.getByRole('status')).toContainText(/Valid/i);
    expectNoConsoleErrors(consoleErrors);
  });
});
