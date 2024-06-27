import { KeyPair } from '@near-js/crypto';
import { expect, Page, test } from '@playwright/test';

import {
  receivingAddresses,
} from '../../utils/constants';
import { overridePasskeyFunctions } from '../../utils/passkeys';
import { isWalletSelectorLoaded, ensureIframeIsVisible, getIframeElement } from '../../utils/walletSelector';
import SignMultiChain from '../models/SignMultiChain';

let page: Page;
let signMultiChain: SignMultiChain;

const userFAK = process.env.MULTICHAIN_TEST_ACCOUNT_FAK;
const accountId = process.env.MULTICHAIN_TEST_ACCOUNT_ID;

const fakKeyPair = KeyPair.fromString(userFAK);

let isWebkit = false;

const isAuthenticated = async (loggedIn: boolean) => {
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
    isWebkit = browser.browserType().name() === 'webkit';
    const context = await browser.newContext();
    page = await context.newPage();
    signMultiChain = new SignMultiChain(page);
    signMultiChain.setIsWebkit(isWebkit);
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
    await ensureIframeIsVisible(page);
    const iframe =  await getIframeElement(page);
    await expect(iframe.getByText('Send 0.01 BNB')).toBeVisible();
    await expect(iframe.getByText('We don’t recognize this app, proceed with caution')).toBeVisible();
    await iframe.locator('button:has-text("Approve")').waitFor({ state: 'visible' });
    await expect(iframe.locator('button:has-text("Approve")')).toBeDisabled();
    await iframe.locator('input[type="checkbox"]').check();
    await expect(iframe.locator('button:has-text("Approve")')).toBeEnabled();
  });

  test('Should Fail: if not authenticated', async () => {
    await isWalletSelectorLoaded(page);
    await isAuthenticated(false);
    await signMultiChain.submitAndApproveTransaction({
      keyType: 'personalKey', assetType: 'eth', amount: 0.001, address: receivingAddresses.ETH_BNB
    });
    await ensureIframeIsVisible(page);
    const iframe =  await getIframeElement(page);
    await signMultiChain.waitForMultiChainResponse();
    await expect(iframe.getByText('You are not authenticated or there has been an indexer failure')).toBeVisible();
  });

  test('Should Pass: Send ETH with Personal Key', async () => {
    await isWalletSelectorLoaded(page);
    await isAuthenticated(true);
    await signMultiChain.submitTransaction({
      keyType: 'personalKey', assetType: 'eth', amount: 0.001, address: receivingAddresses.ETH_BNB
    });
    await ensureIframeIsVisible(page);
    const iframe =  await getIframeElement(page);
    await expect(iframe.getByText('Send 0.001 ETH')).toBeVisible();
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
});
