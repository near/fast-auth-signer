import { KeyPair } from '@near-js/crypto';
import { expect, Page, test } from '@playwright/test';

import { getFastAuthIframe } from '../../utils/constants';
import { overridePasskeyFunctions } from '../../utils/passkeys';
import SignMultiChain from '../models/SignMultiChain';

const receivingAddresses = {
  ETH_BNB: '0x7F780C57D846501De4824046EF4c503Ce1c8eAF9',
};

let page: Page;
let signMultiChain: SignMultiChain;

const userFAK = process.env.MULTICHAIN_TEST_ACCOUNT_FAK;
const accountId = process.env.MULTICHAIN_TEST_ACCOUNT_ID;

const fakKeyPair = KeyPair.fromString(userFAK);

test.describe('Sign MultiChain Transaction', () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    signMultiChain = new SignMultiChain(page);
    await page.goto('/');
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
    await signMultiChain.submitTransactionInfo({
      keyType: 'personalKey', assetType: 'eth', amount: 0.001, address: receivingAddresses.ETH_BNB
    });
    const frame = await signMultiChain.waitForIframeModal();
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
    await signMultiChain.submitAndApproveTransaction({
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
    await signMultiChain.submitAndApproveTransaction({
      keyType: 'personalKey', assetType: 'bnb', amount: 0.001, address: receivingAddresses.ETH_BNB
    });
    const multiChainResponse = await signMultiChain.waitForMultiChainResponse(page);
    expect(multiChainResponse).toHaveProperty('message');
    expect(multiChainResponse).toHaveProperty('transactionHash');
    expect(multiChainResponse.message).toBe('Successfully signed and sent transaction');
  });

  test('Should fail for insufficient funds, Transaction: Unknown Key + ETH', async () => {
    test.slow();
    const walletSelector = page.locator('#ws-loaded');
    await expect(walletSelector).toBeVisible();

    await overridePasskeyFunctions(page, {
      creationKeypair:  fakKeyPair,
      retrievalKeypair: fakKeyPair
    });
    await signMultiChain.submitTransactionInfo({
      keyType: 'unknownKey', assetType: 'eth', amount: 1.001, address: receivingAddresses.ETH_BNB
    });
    const frame = await signMultiChain.waitForIframeModal();
    await frame.locator('div.transaction-details').filter({ hasText: /^https:\/\/app\.unknowndomain\.com$/ }).waitFor({ state: 'visible' });
    await expect(frame.getByText('We don’t recognize this app, proceed with caution')).toBeVisible();
    await expect(frame.locator('button:has-text("Approve")')).toBeDisabled();
    await frame.locator('input[type="checkbox"]').check();
    await expect(frame.locator('button:has-text("Approve")')).toBeEnabled();
    await signMultiChain.clickApproveButton(frame);
    const multiChainResponse = await signMultiChain.waitForMultiChainResponse(page);
    expect(multiChainResponse).toHaveProperty('message');
    expect(multiChainResponse.message).toBe('Failed to send signed transaction.');
  });
});
