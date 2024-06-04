import { KeyPair } from '@near-js/crypto';
import { expect, Page, test } from '@playwright/test';

import PageManager from '../pages/PageManager';
import SignMultiChainPage from '../pages/SignMultiChainPage';
import { getFastAuthIframe } from '../utils/constants';
import { overridePasskeyFunctions } from '../utils/passkeys';

const receivingAddresses = {
  ETH_BNB: '0x7F780C57D846501De4824046EF4c503Ce1c8eAF9',
};
let page: Page;
let pm: PageManager;
let signMultiChainPage: SignMultiChainPage;

const userFAK = process.env.MULTICHAIN_TEST_ACCOUNT_FAK;
const accountId = process.env.MULTICHAIN_TEST_ACCOUNT_ID;

const fakKeyPair = KeyPair.fromString(userFAK);

test.describe('Sign MultiChain Transaction', () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    pm = new PageManager(page);
    signMultiChainPage = pm.getSignMultiChainPage();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(
      // eslint-disable-next-line no-shadow
      async ([accountId]) => {
        window.localStorage.setItem('accountId', JSON.stringify(accountId));
      },
      [accountId]
    );
  });

  test('Should show transaction details(amount, address, ...etc)', async () => {
    test.slow();
    const walletSelector = page.locator('#ws-loaded');
    await expect(walletSelector).toBeVisible();
    await signMultiChainPage.submitTransactionInfo({
      keyType: 'personalKey', assetType: 'eth', amount: 0.001, address: receivingAddresses.ETH_BNB
    });
    const frame = await signMultiChainPage.waitForIframeModal();
    await frame.locator('text=Send 0.001 ETH').waitFor({ state: 'visible' });
    await frame.locator('button:has-text("Approve")').waitFor({ state: 'visible' });
  });

  test('Should fail if not authenticated', async () => {
    test.slow();
    const walletSelector = page.locator('#ws-loaded');
    await expect(walletSelector).toBeVisible();

    await overridePasskeyFunctions(page, {
      creationKeypair:  KeyPair.fromRandom('ed25519'),
      retrievalKeypair: KeyPair.fromRandom('ed25519')
    });
    await signMultiChainPage.submitAndApproveTransaction({
      keyType: 'personalKey', assetType: 'eth', amount: 0.001, address: receivingAddresses.ETH_BNB
    });
    await expect(getFastAuthIframe(page).getByText('You are not authenticated or there has been an indexer failure')).toBeVisible();
  });

  test('Should succeed for Transaction: Personal Key + BNB', async () => {
    test.slow();
    const walletSelector = page.locator('#ws-loaded');
    await expect(walletSelector).toBeVisible();

    await overridePasskeyFunctions(page, {
      creationKeypair:  fakKeyPair,
      retrievalKeypair: fakKeyPair
    });
    await signMultiChainPage.submitAndApproveTransaction({
      keyType: 'personalKey', assetType: 'bnb', amount: 0.001, address: receivingAddresses.ETH_BNB
    });
    const multiChainResponse = await signMultiChainPage.waitForMultiChainResponse(page);
    console.log('multiChainResponse ', multiChainResponse);
    expect(multiChainResponse).toHaveProperty('message');
    expect(multiChainResponse).toHaveProperty('transactionHash');
    expect(multiChainResponse.message).toBe('Successfully signed and sent transaction');
  });
});
