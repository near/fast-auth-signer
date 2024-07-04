import { KeyPair } from '@near-js/crypto';
import { expect, Page, test } from '@playwright/test';

import {
  receivingAddresses, getFastAuthIframe
} from '../../utils/constants';
import { getRandomEmailAndAccountId } from '../../utils/email';
import { connectToProvider, viewCallerDataWithDataField } from '../../utils/multiChain';
import { overridePasskeyFunctions } from '../../utils/passkeys';
import { isWalletSelectorLoaded } from '../../utils/walletSelector';
import SignMultiChain from '../models/SignMultiChain';

let page: Page;
let signMultiChain: SignMultiChain;

const userFAK = process.env.MULTICHAIN_TEST_ACCOUNT_FAK;
const accountId = process.env.MULTICHAIN_TEST_ACCOUNT_ID;

const isAuthenticated = async (loggedIn: boolean) => {
  const fakKeyPair = KeyPair.fromString(userFAK);

  if (!page) return;
  if (loggedIn) {
    await overridePasskeyFunctions(page, {
      creationKeypair:  fakKeyPair,
      retrievalKeypair: fakKeyPair
    });
    return;
  }
  await overridePasskeyFunctions(page, {
    creationKeypair:  KeyPair.fromRandom('ed25519'),
    retrievalKeypair: KeyPair.fromRandom('ed25519')
  });
};

test.describe('Sign MultiChain', () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    signMultiChain = new SignMultiChain(page);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    /* webpack-dev-server adds a hidden iframe for hot reloading, which interferes with event propagation,
    causing Playwright tests to run longer (up to 40 minutes). To prevent this, the iframe needs to be disabled.
    This issue doesn't occur in production since webpack-dev-server is only used in development. */
    await signMultiChain.disablePointerEventsInterruption();
    await page.evaluate(
    // eslint-disable-next-line no-shadow
      async ([accountId]) => {
        window.localStorage.setItem('accountId', JSON.stringify(accountId));
      },
      [accountId]
    );
  });

  test.beforeEach(() => {
    test.slow();
  });

  test('Should show transaction details', async () => {
    await isWalletSelectorLoaded(page);
    await signMultiChain.submitTransaction({
      keyType: 'unknownKey', assetType: 'bnb', amount: 0.01, address: receivingAddresses.ETH_BNB
    });
    const frame = getFastAuthIframe(page);
    await frame.locator('text=Send 0.01 BNB').waitFor({ state: 'visible' });
    await frame.locator('button:has-text("Approve")').waitFor({ state: 'visible' });
    await expect(frame.getByText('We don’t recognize this app, proceed with caution')).toBeVisible();
    await expect(frame.locator('button:has-text("Approve")')).toBeDisabled();
    await frame.locator('input[type="checkbox"]').check();
    await expect(frame.locator('button:has-text("Approve")')).toBeEnabled();
  });

  test('Should Fail: if not authenticated', async () => {
    await isWalletSelectorLoaded(page);
    await isAuthenticated(false);
    await signMultiChain.submitAndApproveTransaction({
      keyType: 'personalKey', assetType: 'eth', amount: 0.001, address: receivingAddresses.ETH_BNB
    });
    await signMultiChain.waitForMultiChainResponse();
    await expect(page.locator('#nfw-connect-iframe')).toBeVisible();
    await expect(getFastAuthIframe(page).getByText('You are not authenticated or there has been an indexer failure')).toBeVisible();
  });

  test('Should Pass: Send ETH with Personal Key', async () => {
    await isWalletSelectorLoaded(page);
    await isAuthenticated(true);
    await signMultiChain.submitTransaction({
      keyType: 'personalKey', assetType: 'eth', amount: 0.001, address: receivingAddresses.ETH_BNB
    });
    const frame = getFastAuthIframe(page);
    await frame.locator('text=Send 0.001 ETH').waitFor({ state: 'visible' });
    await signMultiChain.clickApproveButton();
    const multiChainResponse = await signMultiChain.waitForMultiChainResponse();
    expect(multiChainResponse.transactionHash).toBeDefined();
    expect(multiChainResponse).toHaveProperty('message');
    expect(multiChainResponse.message).toBe('Successfully signed and sent transaction');
    await expect(page.locator('#nfw-connect-iframe')).not.toBeVisible();
  });

  // Skipping this because of the unpredictable nature concerning replacement fee
  test.skip('Should Pass: Send BNB with domain Key', async () => {
    await isWalletSelectorLoaded(page);
    await isAuthenticated(true);
    await signMultiChain.submitTransaction({
      keyType: 'domainKey', assetType: 'bnb', amount: 0.0001, address: receivingAddresses.ETH_BNB
    });
    const multiChainResponse = await signMultiChain.waitForMultiChainResponse();
    expect(multiChainResponse.transactionHash).toBeDefined();
    expect(multiChainResponse).toHaveProperty('message');
    expect(multiChainResponse.message).toBe('Successfully signed and sent transaction');
    await expect(page.locator('#nfw-connect-iframe')).not.toBeVisible();
  });

  test('Should Fail: Insufficient Funds with Unknown Key + BTC', async () => {
    await isWalletSelectorLoaded(page);
    await isAuthenticated(true);
    await signMultiChain.submitTransaction({
      keyType: 'unknownKey', assetType: 'btc', amount: 0.01, address: receivingAddresses.BTC
    });
    const multiChainResponse = await signMultiChain.waitForMultiChainResponse();
    expect(multiChainResponse).toHaveProperty('message');
    expect(multiChainResponse.message).toContain('Invalid transaction');
    await expect(page.locator('#nfw-connect-iframe')).not.toBeVisible();
  });

  test('Should Pass: Send ETH with Personal Key and Function Call', async () => {
    const { accountId: randomString } = getRandomEmailAndAccountId();
    await page.evaluate(
      ([randomStringForTest]) => {
        window.localStorage.setItem('randomStringForTest', randomStringForTest);
      },
      [randomString]
    );
    await isWalletSelectorLoaded(page);
    await isAuthenticated(true);
    await signMultiChain.submitTransaction({
      keyType:        'personalKey',
      assetType:      'eth',
      amount:         0,
      address:        receivingAddresses.ETH_SMART_CONTRACT,
      isFunctionCall: true
    });
    await signMultiChain.clickApproveButton();
    const multiChainResponse = await signMultiChain.waitForMultiChainResponse();
    expect(multiChainResponse.transactionHash).toBeDefined();

    const provider = await connectToProvider();
    await new Promise((resolve) => { setTimeout(resolve, 50000); });
    const result = await viewCallerDataWithDataField(provider, randomString);
    expect(result).toEqual('test');

    await expect(page.locator('#nfw-connect-iframe')).not.toBeVisible();
  });
});
