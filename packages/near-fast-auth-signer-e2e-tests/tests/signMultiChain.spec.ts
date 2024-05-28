import { test } from '@playwright/test';

import PageManager from '../pages/PageManager';

const receivingAddresses = {
  ETH_BNB: '0x7F780C57D846501De4824046EF4c503Ce1c8eAF9',
};

test.beforeEach(async ({ page, baseURL }) => {
  await page.goto(baseURL);
});

test('Shows confirmation modal for transactions with personal key', async ({ page }) => {
  const pm = new PageManager(page);
  test.slow();
  await pm.getSignMultiChainPage().submitTransaction({
    keyType: 'personalKey', assetType: 'bnb', amount: 0.03, address: receivingAddresses.ETH_BNB
  });
});

test('Shows unknown confirmation modal for transactions with wrong key', async ({ page }) => {
  const pm = new PageManager(page);
  test.slow();
  await pm.getSignMultiChainPage().submitTransaction({
    keyType: 'wrongKey', assetType: 'eth', amount: 0.07, address: receivingAddresses.ETH_BNB
  });
});

test('Should proceed without confirmation for domain key transactions', async ({ page }) => {
  const pm = new PageManager(page);
  test.slow();
  await pm.getSignMultiChainPage().submitTransaction({
    keyType: 'domainKey', assetType: 'eth', amount: 0.08, address: receivingAddresses.ETH_BNB
  });
});

test('Test transaction', async ({ page }) => {
  const pm = new PageManager(page);
  test.slow();
  await pm.getSignMultiChainPage().approveTransaction({
    keyType: 'personalKey', assetType: 'eth', amount: 0.001, address: receivingAddresses.ETH_BNB
  });
});
