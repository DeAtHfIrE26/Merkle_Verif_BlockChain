import { test, expect, expectNoConsoleErrors, gotoAndSettle } from './fixtures';

test.describe('Transfer Tracker', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAndSettle(page, '/transfers');
  });

  test('is unmistakably labelled as simulated', async ({ page, consoleErrors }) => {
    await expect(page.getByText('Simulated data')).toBeVisible();
    await expect(page.getByRole('note')).toContainText(/not real transactions/i);
    expectNoConsoleErrors(consoleErrors);
  });

  test('renders a table of transfers', async ({ page }) => {
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('row')).not.toHaveCount(0);
    await expect(page.getByRole('columnheader', { name: 'Amount' })).toBeVisible();
  });

  test('filtering narrows results and clearing restores them', async ({ page }) => {
    const search = page.getByLabel(/Filter by sender/i);
    await search.fill('zzzzzznomatch');
    await expect(page.getByText(/No transfers match/i)).toBeVisible();
    await page.getByRole('button', { name: /Clear filter/i }).click();
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('pagination moves between pages', async ({ page, consoleErrors }) => {
    const next = page.getByRole('button', { name: /Next/i });
    await expect(page.getByText(/Page 1 of/i)).toBeVisible();
    await next.click();
    await expect(page.getByText(/Page 2 of/i)).toBeVisible();
    await page.getByRole('button', { name: /Previous/i }).click();
    await expect(page.getByText(/Page 1 of/i)).toBeVisible();
    expectNoConsoleErrors(consoleErrors);
  });

  test('regenerating produces a different feed', async ({ page }) => {
    const firstCell = page.getByRole('table').getByRole('cell').first();
    const before = await firstCell.textContent();
    await page.getByRole('button', { name: /Regenerate feed/i }).click();
    await expect(firstCell).not.toHaveText(before ?? '');
  });

  test('shows the real subgraph query and schema', async ({ page }) => {
    await expect(page.getByText(/orderDirection: desc/)).toBeVisible();
    await expect(page.getByText(/type Transfer @entity/)).toBeVisible();
  });

  test('explains why it is simulated rather than hiding it', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Why this one is simulated/i })).toBeVisible();
  });
});
