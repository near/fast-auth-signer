import { KeyPair } from '@near-js/crypto';
import { test } from '@playwright/test';

import PageManager from '../pages/PageManager';
import { isServiceAccountAvailable, initializeAdmin, createAccount } from '../utils/createAccount';

const { describe, beforeEach, beforeAll } = test;

const receivingAddresses = {
  ETH_BNB: '0x7F780C57D846501De4824046EF4c503Ce1c8eAF9',
};

const userFAK = KeyPair.fromRandom('ed25519');
const userLAK = KeyPair.fromRandom('ed25519');
let accountId;

describe('Sign MultiChain Transaction', () => {
  beforeAll(async ({ browser, page }, { workerIndex }) => {
    if (isServiceAccountAvailable()) {
      initializeAdmin();
    }
    const context = await browser.newContext();
    page = await context.newPage();
    const testDapp = new TestDapp(page);
    const user = `testuser-playwright-fastauth-${workerIndex}-${Date.now()}`;
    const email = `${user}@example.com`;
    accountId = `${user}.testnet`;
    const frpKeypair = KeyPair.fromRandom('ed25519');
    await createAccount({
      email,
      accountId: user,
      FAKs:      [userFAK],
      LAKs:      [{
        public_key:   userLAK.getPublicKey().toString(),
        receiver_id:  accountId,
        allowance:    '100000000000000000000000000',
        method_names: '["claim"]',
      }],
      oidcKeyPair: frpKeypair
    });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await testDapp.loginWithKeyPairLocalStorage(accountId, userLAK, userFAK);
    // eslint-disable-next-line no-shadow
    await page.evaluate(([accountId]) => {
      window.localStorage.setItem('transactionData', JSON.stringify({
        receiverId: 'v1.social08.testnet',
        actions:    [
          {
            type:   'FunctionCall',
            params: {
              methodName: 'set',
              args:       {
                data: {
                  [accountId]: {
                    'fast-auth-e2e-test': 'true'
                  }
                }
              },
              gas:     '300000000000000',
              deposit: '20000000000000000000000'
            }
          }
        ]
      }));
    }, [accountId]);
  });

  beforeEach(async ({ page, baseURL }) => {
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
});
