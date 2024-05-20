import { test } from '@playwright/test';

import PageManager from '../pages/PageManager';

test.beforeEach(async ({ page, baseURL }) => {
  await page.goto(baseURL);
});

test('Should show  confirmation modal for personal key transactions', async ({ page }) => {
  const pm = new PageManager(page);
  test.slow();
  await pm.getSignMultiChainPage().simulateTransaction('personalKey', 'bnb', 0.03);
});

test('Should show unknown  confirmation modal for wrong key transactions', async ({ page }) => {
  const pm = new PageManager(page);
  test.slow();
  await pm.getSignMultiChainPage().simulateTransaction('wrongKey', 'eth', 0.07);
});

test('Should not show confirmation modal for domain key transactions', async ({ page }) => {
  const pm = new PageManager(page);
  test.slow();
  await pm.getSignMultiChainPage().simulateTransaction('domainKey', 'eth', 0.08);
});
