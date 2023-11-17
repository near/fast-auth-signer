import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('http://localhost:3030/');

  const walletSelector = page.locator('#ws-loaded');
  await walletSelector.waitFor();

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Fast Auth Test App/);
});
