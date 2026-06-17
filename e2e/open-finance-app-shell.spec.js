import { test, expect } from '@playwright/test';

async function assertNoHorizontalOverflow(page, label) {
  const metrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    docClientWidth: document.documentElement.clientWidth,
    docScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
  }));

  const widest = Math.max(metrics.docScrollWidth, metrics.bodyScrollWidth, metrics.docClientWidth);
  expect(widest, `${label} horizontal overflow: ${JSON.stringify(metrics)}`).toBeLessThanOrEqual(metrics.innerWidth + 1);
}

test.describe('Open Finance app shell', () => {
  test('applies the editorial workspace frame to the app route', async ({ page }) => {
    await page.goto('/app');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await expect(page.getByRole('heading', { name: 'Open Finance' })).toBeVisible();
    await expect(page.getByText('OF / 2026')).toBeVisible();
    await expect(page.getByText('Private ledger workspace')).toBeVisible();
    await expect(page.getByRole('main', { name: /open finance app workspace/i })).toBeVisible();
    await expect(page.getByRole('navigation', { name: /app sections/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Finance Tracker' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Subscriptions' })).toBeVisible();
  });

  test('uses the landing page Aegean ledger design language inside the app', async ({ page }) => {
    await page.goto('/app');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await expect(page.getByText(/Aegean ledger/i).first()).toBeVisible();
    await expect(page.getByText(/Greek ledger/i).first()).toBeVisible();
    await expect(page.getByRole('navigation', { name: /customer app ledger sections/i })).toBeVisible();
    await expect(page.getByRole('tablist', { name: /finance workspace modules/i })).toBeVisible();
    await expect(page.locator('.of-app-window')).toBeVisible();
    await expect(page.getByRole('tab', { name: /Finance Tracker/i })).toHaveAttribute('aria-selected', 'true');
  });

  test('keeps the editorial app shell within compact mobile width', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/app');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await expect(page.getByText('Private ledger workspace')).toBeVisible();
    await assertNoHorizontalOverflow(page, 'app shell mobile');
  });
});
