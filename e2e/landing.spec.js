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

test.describe('Open Finance landing page', () => {
  test('renders at root and links into the app', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /private money tracking, without the spreadsheet sprawl/i })).toBeVisible();
    await expect(page.getByText(/Bangkok \/ local-first finance \/ Aegean ledger grammar/i)).toBeVisible();
    await expect(page.getByAltText(/Editorial collage with paper texture/i)).toBeVisible();
    await expect(page.getByText(/Open Design/i)).not.toBeVisible();

    await page.getByRole('link', { name: /open the preview/i }).first().click();
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByRole('heading', { name: 'Open Finance' })).toBeVisible();
  });

  test('keeps the compatibility landing route available', async ({ page }) => {
    await page.goto('/landing');

    await expect(page.getByRole('heading', { name: /private money tracking, without the spreadsheet sprawl/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /read the method/i }).first()).toHaveAttribute('href', '#method');
  });

  test('does not overflow on compact mobile', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /private money tracking, without the spreadsheet sprawl/i })).toBeVisible();
    await assertNoHorizontalOverflow(page, 'landing mobile');
  });
});
