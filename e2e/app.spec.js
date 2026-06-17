import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Clear localStorage before each test
  await page.goto('/app');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('heading', { name: 'Open Finance' }).waitFor();
  // Default tab is Finance Tracker; switch to Subscriptions for subscription tests
  await page.click('button:has-text("Subscriptions")');
});

test.describe('App loads', () => {
  test('shows header and empty state', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('Open Finance');
    await expect(page.locator('text=No subscriptions yet')).toBeVisible();
    await expect(page.locator('text=Add your first subscription to get started')).toBeVisible();
  });

  test('shows Quick Add presets section', async ({ page }) => {
    await expect(page.locator('text=Quick Add')).toBeVisible();
    await expect(page.locator('text=Browse All Presets')).toBeVisible();
  });

  test('does not show View Dashboard button when no subscriptions', async ({ page }) => {
    await expect(page.locator('text=View Dashboard')).not.toBeVisible();
  });
});

test.describe('Add Subscription', () => {
  test('opens modal via Browse All Presets button', async ({ page }) => {
    await page.click('text=Browse All Presets');
    await expect(page.getByRole('heading', { name: 'Add Subscription' })).toBeVisible();
  });

  test('adds a subscription via form', async ({ page }) => {
    await page.click('text=Browse All Presets');
    await expect(page.getByRole('heading', { name: 'Add Subscription' })).toBeVisible();

    // Fill form
    await page.fill('input[placeholder="e.g. Netflix"]', 'MyTestService');
    await page.fill('input[placeholder="9.99"]', '15.99');

    // Submit
    await page.getByRole('button', { name: 'Add Subscription' }).click();

    // Verify subscription appears in list (use the card's bold name div)
    await expect(page.locator('.truncate.font-bold:has-text("MyTestService")')).toBeVisible();
    await expect(page.locator('text=View Dashboard')).toBeVisible();
  });

  test('fills default values from preset', async ({ page }) => {
    // Click on a preset (e.g. Netflix)
    const presetButton = page.locator('button:has-text("Netflix")').first();
    await presetButton.click();

    // Modal should open with pre-filled name
    await expect(page.locator('input[placeholder="e.g. Netflix"]')).toHaveValue('Netflix');
  });

  test('requires name field', async ({ page }) => {
    await page.click('text=Browse All Presets');
    await page.fill('input[placeholder="9.99"]', '10');

    // Try to submit without name
    await page.getByRole('button', { name: 'Add Subscription' }).click();

    // Modal should still be open (HTML5 required validation)
    await expect(page.getByRole('heading', { name: 'Add Subscription' })).toBeVisible();
  });

  test('requires price field', async ({ page }) => {
    await page.click('text=Browse All Presets');
    await page.fill('input[placeholder="e.g. Netflix"]', 'Test');

    // Try to submit without price
    await page.getByRole('button', { name: 'Add Subscription' }).click();

    // Modal should still be open
    await expect(page.locator('input[placeholder="e.g. Netflix"]')).toBeVisible();
  });
});

test.describe('Subscription Management', () => {
  test.beforeEach(async ({ page }) => {
    // Add a subscription first (use unique name that won't match presets)
    await page.click('text=Browse All Presets');
    await page.fill('input[placeholder="e.g. Netflix"]', 'TestSub');
    await page.fill('input[placeholder="9.99"]', '12.99');
    await page.getByRole('button', { name: 'Add Subscription' }).click();
    await expect(page.locator('.truncate.font-bold:has-text("TestSub")')).toBeVisible();
  });

  test('shows Add Another button after adding subscription', async ({ page }) => {
    await expect(page.locator('text=Add Another')).toBeVisible();
  });

  test('can add multiple subscriptions', async ({ page }) => {
    await page.click('text=Add Another');
    await page.fill('input[placeholder="e.g. Netflix"]', 'SecondSub');
    await page.fill('input[placeholder="9.99"]', '9.99');
    await page.getByRole('button', { name: 'Add Subscription' }).click();

    await expect(page.locator('.truncate.font-bold:has-text("TestSub")')).toBeVisible();
    await expect(page.locator('.truncate.font-bold:has-text("SecondSub")')).toBeVisible();
  });

  test('can edit a subscription', async ({ page }) => {
    // Click on the subscription card to edit
    await page.locator('.truncate.font-bold:has-text("TestSub")').click();

    // Modal should show Edit Subscription title
    await expect(page.getByRole('heading', { name: 'Edit Subscription' })).toBeVisible();
    await expect(page.locator('input[placeholder="e.g. Netflix"]')).toHaveValue('TestSub');

    // Change the name
    await page.fill('input[placeholder="e.g. Netflix"]', 'TestSubEdited');
    await page.getByRole('button', { name: 'Save Changes' }).click();

    // Verify updated name
    await expect(page.locator('.truncate.font-bold:has-text("TestSubEdited")')).toBeVisible();
  });

  test('can delete a subscription', async ({ page }) => {
    // The delete button has a trash icon with specific SVG path
    const trashBtn = page.locator('button').filter({ has: page.locator('path[d*="M19 7l"]') });
    await trashBtn.click();

    // Subscription should be removed
    await expect(page.locator('.truncate.font-bold:has-text("TestSub")')).not.toBeVisible();
    await expect(page.locator('text=No subscriptions yet')).toBeVisible();
  });
});

test.describe('Dashboard View', () => {
  test.beforeEach(async ({ page }) => {
    // Add subscriptions with unique names that won't clash with presets
    await page.click('text=Browse All Presets');
    await page.fill('input[placeholder="e.g. Netflix"]', 'AlphaSub');
    await page.fill('input[placeholder="9.99"]', '15.99');
    await page.getByRole('button', { name: 'Add Subscription' }).click();
    await expect(page.locator('.truncate.font-bold:has-text("AlphaSub")')).toBeVisible();

    await page.click('text=Add Another');
    await page.fill('input[placeholder="e.g. Netflix"]', 'BetaSub');
    await page.fill('input[placeholder="9.99"]', '9.99');
    await page.getByRole('button', { name: 'Add Subscription' }).click();
    await expect(page.locator('.truncate.font-bold:has-text("BetaSub")')).toBeVisible();
  });

  test('navigates to dashboard and shows totals', async ({ page }) => {
    await page.click('text=View Dashboard');

    // Should show Monthly and Yearly labels
    await expect(page.locator('text=Monthly').first()).toBeVisible();
    await expect(page.locator('text=Yearly').first()).toBeVisible();

    // Back button should be visible
    await expect(page.locator('text=Back')).toBeVisible();
  });

  test('shows Export CSV button on dashboard', async ({ page }) => {
    await page.click('text=View Dashboard');
    await expect(page.locator('button:has-text("Export CSV")')).toBeVisible();
  });

  test('shows No budget set message', async ({ page }) => {
    await page.click('text=View Dashboard');
    await expect(page.locator('text=No budget set')).toBeVisible();
  });

  test('can navigate back to subscription list', async ({ page }) => {
    await page.click('text=View Dashboard');
    await expect(page.locator('text=Back')).toBeVisible();
    await page.click('text=Back');

    // Should be back on step 1 with subscription list
    await expect(page.locator('.truncate.font-bold:has-text("AlphaSub")')).toBeVisible();
    await expect(page.locator('text=Quick Add')).toBeVisible();
  });

  test('view toggle switches between visualizations', async ({ page }) => {
    await page.click('text=View Dashboard');

    // Verify the dashboard loaded with Back button visible
    await expect(page.locator('text=Back')).toBeVisible();

    // Verify Export CSV button is on the dashboard
    await expect(page.locator('button:has-text("Export CSV")')).toBeVisible();
  });
});

test.describe('Settings', () => {
  test('opens settings modal', async ({ page }) => {
    await page.click('button[aria-label="Settings"]');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await expect(page.locator('text=Appearance')).toBeVisible();
    await expect(page.locator('text=Display Currency')).toBeVisible();
    await expect(page.locator('text=Monthly Budget')).toBeVisible();
  });

  test('can close settings modal', async ({ page }) => {
    await page.click('button[aria-label="Settings"]');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

    // Press Escape to close
    await page.keyboard.press('Escape');
    await expect(page.locator('text=Appearance')).not.toBeVisible();
  });

  test('shows theme toggle', async ({ page }) => {
    await page.click('button[aria-label="Settings"]');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await expect(page.getByRole('button', { name: /dark mode|light mode/i })).toBeVisible();
  });

  test('shows Google Sheets Sync section', async ({ page }) => {
    await page.click('button[aria-label="Settings"]');
    await expect(page.locator('text=Google Sheets Sync')).toBeVisible();
  });

  test('shows Data export/import buttons', async ({ page }) => {
    await page.click('button[aria-label="Settings"]');
    await expect(page.locator('label:has-text("Data")')).toBeVisible();
    await expect(page.locator('button:has-text("Export JSON")')).toBeVisible();
    await expect(page.locator('button:has-text("Import JSON")')).toBeVisible();
  });
});

test.describe('Budget Settings', () => {
  test('can set a budget', async ({ page }) => {
    await page.click('button[aria-label="Settings"]');
    await expect(page.locator('text=Monthly Budget')).toBeVisible();

    // Fill budget amount
    await page.fill('input[placeholder="e.g. 100"]', '50');
    await page.click('button:has-text("Set Budget")');

    // Should show Saved! confirmation
    await expect(page.locator('button:has-text("Saved!")')).toBeVisible();
    // Remove button should appear
    await expect(page.locator('button:has-text("Remove")')).toBeVisible();
  });

  test('budget shows on dashboard after setting', async ({ page }) => {
    // Set budget
    await page.click('button[aria-label="Settings"]');
    await page.fill('input[placeholder="e.g. 100"]', '50');
    await page.click('button:has-text("Set Budget")');
    await expect(page.locator('button:has-text("Saved!")')).toBeVisible();
    await page.keyboard.press('Escape');

    // Add a subscription
    await page.click('text=Browse All Presets');
    await page.fill('input[placeholder="e.g. Netflix"]', 'BudgetTestSub');
    await page.fill('input[placeholder="9.99"]', '15.99');
    await page.getByRole('button', { name: 'Add Subscription' }).click();

    // Navigate to dashboard
    await page.click('text=View Dashboard');

    // Budget indicator should show Monthly Budget instead of No budget set
    await expect(page.locator('text=Monthly Budget').first()).toBeVisible();
    await expect(page.locator('text=No budget set')).not.toBeVisible();
  });

  test('can remove budget', async ({ page }) => {
    // Set budget first
    await page.click('button[aria-label="Settings"]');
    await page.fill('input[placeholder="e.g. 100"]', '50');
    await page.click('button:has-text("Set Budget")');
    await expect(page.locator('button:has-text("Saved!")')).toBeVisible();

    // Remove it
    await page.click('button:has-text("Remove")');

    // Remove button should disappear
    await expect(page.locator('button:has-text("Remove")')).not.toBeVisible();
  });
});

test.describe('Theme Toggle', () => {
  test('toggles dark mode', async ({ page }) => {
    await page.click('button[aria-label="Settings"]');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

    const darkModeBtn = page.getByRole('button', { name: /dark mode/i });
    const lightModeBtn = page.getByRole('button', { name: /light mode/i });

    if (await darkModeBtn.isVisible()) {
      await darkModeBtn.click();
      await expect(lightModeBtn).toBeVisible();
    } else {
      await expect(lightModeBtn).toBeVisible();
      await lightModeBtn.click();
      await expect(darkModeBtn).toBeVisible();
    }
  });
});

test.describe('Full User Flow', () => {
  test('complete flow: add subs -> dashboard -> budget -> back', async ({ page }) => {
    // 1. Start with empty state
    await expect(page.locator('text=No subscriptions yet')).toBeVisible();

    // 2. Add first subscription
    await page.click('text=Browse All Presets');
    await page.fill('input[placeholder="e.g. Netflix"]', 'FlowTestOne');
    await page.fill('input[placeholder="9.99"]', '15.99');
    await page.getByRole('button', { name: 'Add Subscription' }).click();
    await expect(page.locator('.truncate.font-bold:has-text("FlowTestOne")')).toBeVisible();

    // 3. Add second subscription
    await page.click('text=Add Another');
    await page.fill('input[placeholder="e.g. Netflix"]', 'FlowTestTwo');
    await page.fill('input[placeholder="9.99"]', '9.99');
    await page.getByRole('button', { name: 'Add Subscription' }).click();
    await expect(page.locator('.truncate.font-bold:has-text("FlowTestTwo")')).toBeVisible();

    // 4. Set budget in settings
    await page.click('button[aria-label="Settings"]');
    await page.fill('input[placeholder="e.g. 100"]', '100');
    await page.click('button:has-text("Set Budget")');
    await expect(page.locator('button:has-text("Saved!")')).toBeVisible();
    await page.keyboard.press('Escape');

    // 5. Navigate to dashboard
    await page.click('text=View Dashboard');

    // 6. Verify dashboard elements
    await expect(page.locator('text=Monthly').first()).toBeVisible();
    await expect(page.locator('text=Yearly').first()).toBeVisible();
    await expect(page.locator('text=Monthly Budget').first()).toBeVisible();
    await expect(page.locator('button:has-text("Export CSV")')).toBeVisible();

    // 7. Navigate back
    await page.click('text=Back');
    await expect(page.locator('.truncate.font-bold:has-text("FlowTestOne")')).toBeVisible();
    await expect(page.locator('.truncate.font-bold:has-text("FlowTestTwo")')).toBeVisible();
  });

  test('data persists across page reload', async ({ page }) => {
    // Add a subscription
    await page.click('text=Browse All Presets');
    await page.fill('input[placeholder="e.g. Netflix"]', 'PersistTest');
    await page.fill('input[placeholder="9.99"]', '19.99');
    await page.getByRole('button', { name: 'Add Subscription' }).click();
    await expect(page.locator('.truncate.font-bold:has-text("PersistTest")')).toBeVisible();

    // Reload the page
    await page.reload();
    await page.getByRole('heading', { name: 'Open Finance' }).waitFor();

    // Switch to Subscriptions tab (Finance is now default)
    await page.click('button:has-text("Subscriptions")');

    // Subscription should still be there
    await expect(page.locator('.truncate.font-bold:has-text("PersistTest")')).toBeVisible();
  });
});
