import { test, expect } from '@playwright/test';

const MOBILE_VIEWPORTS = [
  { name: 'iphone-12', width: 390, height: 844 },
  { name: 'pixel-5', width: 393, height: 851 },
  { name: 'small-android', width: 360, height: 800 },
];

async function assertNoHorizontalOverflow(page, label) {
  const metrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    docClientWidth: document.documentElement.clientWidth,
    docScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    docOverflowX: getComputedStyle(document.documentElement).overflowX,
    bodyOverflowX: getComputedStyle(document.body).overflowX,
  }));

  const widest = Math.max(metrics.docScrollWidth, metrics.bodyScrollWidth, metrics.docClientWidth);
  expect.soft(widest, `${label} -> scrollWidth exceeds viewport (${JSON.stringify(metrics)})`).toBeLessThanOrEqual(metrics.innerWidth + 1);
}

async function addSubscription(page, { name = 'MobilePlan', price = '9.99' } = {}) {
  await page.click('button:has-text("Subscriptions")');
  await page.click('text=Browse All Presets');
  await page.fill('input[placeholder="e.g. Netflix"]', name);
  await page.fill('input[placeholder="9.99"]', price);
  await page.getByRole('button', { name: 'Add Subscription' }).click();
  await expect(page.locator(`.truncate.font-bold:has-text("${name}")`)).toBeVisible();
}

async function importManyFinanceRows(page, rowCount = 220) {
  const lines = ['Date,Description,Amount'];
  for (let i = 1; i <= rowCount; i++) {
    const day = String((i % 28) + 1).padStart(2, '0');
    lines.push(`2026-02-${day},MobileTxn ${i},-${(10 + i).toFixed(2)}`);
  }

  const input = page.locator('[data-testid="statement-upload-input"]');
  await input.setInputFiles({
    name: 'mobile-large-statement.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(lines.join('\n')),
  });
  await expect(page.locator('text=Statements processed')).toBeVisible();
}

for (const viewport of MOBILE_VIEWPORTS) {
  test.describe(`Mobile layout: ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test('finance + subscriptions screens stay aligned', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await page.waitForSelector('text=Chameleon');

      // Finance step 1 (empty state)
      await assertNoHorizontalOverflow(page, `${viewport.name} finance step1 empty`);

      // Finance step 1 (heavy imported list)
      await importManyFinanceRows(page);
      await assertNoHorizontalOverflow(page, `${viewport.name} finance step1 heavy list`);
      await expect(page.getByTestId('finance-view-dashboard-button')).toBeVisible();
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await expect(page.getByTestId('finance-view-dashboard-button')).toBeVisible();
      await assertNoHorizontalOverflow(page, `${viewport.name} finance step1 bottom`);

      // Finance step 2 (dashboard)
      await page.getByTestId('finance-view-dashboard-button').click();
      await expect(page.locator('text=Back')).toBeVisible();
      await assertNoHorizontalOverflow(page, `${viewport.name} finance step2 dashboard`);

      // Subscriptions step 1 + step 2
      await addSubscription(page, { name: `Sub-${viewport.name}`, price: '12.5' });
      await assertNoHorizontalOverflow(page, `${viewport.name} subscriptions step1`);
      await page.click('text=View Dashboard');
      await expect(page.locator('text=Back')).toBeVisible();
      await assertNoHorizontalOverflow(page, `${viewport.name} subscriptions step2`);
    });
  });
}

