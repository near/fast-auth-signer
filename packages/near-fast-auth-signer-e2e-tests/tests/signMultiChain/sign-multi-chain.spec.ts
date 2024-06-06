import { KeyPair } from '@near-js/crypto';
import { expect, Page, test } from '@playwright/test';

import { fetchEVMWalletBalance, fillWallet } from '../../utils/api';
import { getFastAuthIframe } from '../../utils/constants';
import { overridePasskeyFunctions } from '../../utils/passkeys';
import SignMultiChain from '../models/SignMultiChain';

// Below are the static derived addresses
const ETH_PERSONAL_KEY_ADDRESS = '0xf64750f13f75fb9e2f4d9fd98ab72d742d1e33eb';
const BNB_DOMAIN_KEY_ADDRESS =  '0x81d205120a9f04d3f1ce733c5ed0a0bc66714c71';

// BNB_PERSONAL_KEY_ADDRESS => '0xf64750f13f75fb9e2f4d9fd98ab72d742d1e33eb';
// ETH_UNKNOWN_KEY_ADDRESS => '0xf64750f13f75fb9e2f4d9fd98ab72d742d1e33eb';
// BNB_UNKNOWN_KEY_ADDRESS => '0xf64750f13f75fb9e2f4d9fd98ab72d742d1e33eb';
// ETH_DOMAIN_KEY_ADDRESS =>  '0x81d205120a9f04d3f1ce733c5ed0a0bc66714c71';

const receivingAddresses = {
  ETH_BNB: '0x7F780C57D846501De4824046EF4c503Ce1c8eAF9',
  BTC:     'msMLG6MyKQQnLKwnTuMAsWMTCvCm1NTrgM'
};

let page: Page;
let signMultiChain: SignMultiChain;

const userFAK = process.env.MULTICHAIN_TEST_ACCOUNT_FAK;
const accountId = process.env.MULTICHAIN_TEST_ACCOUNT_ID;

const fakKeyPair = KeyPair.fromString(userFAK);

test.describe('Sign MultiChain', () => {
  // Retry failed tests twice before giving up
  // test.describe.configure({ retries: 2 });

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    signMultiChain = new SignMultiChain(page);
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

  test.afterAll(async () => {
    // Check if the derived address are low on funds and request new testnet tokens
    try {
      const balances = await Promise.all([
        fetchEVMWalletBalance(ETH_PERSONAL_KEY_ADDRESS, 'eth-sepolia'),
        fetchEVMWalletBalance(BNB_DOMAIN_KEY_ADDRESS, 'bsc-testnet')
      ]);
      const faucetRequests = [];
      if (balances[0] < 0.2) faucetRequests.push(fillWallet(ETH_PERSONAL_KEY_ADDRESS, 'eth'));
      if (balances[1] < 0.2) faucetRequests.push(fillWallet(BNB_DOMAIN_KEY_ADDRESS, 'bnb'));
      if (faucetRequests.length) {
        console.log('Request token from faucet');
        await Promise.all(faucetRequests);
      }
    } catch (e) {
      console.log('Error requesting token from faucet ', e.message);
    }
  });

  test('Should show transaction details', async () => {
    test.slow();
    const walletSelector = page.locator('#ws-loaded');
    await expect(walletSelector).toBeVisible();
    await signMultiChain.submitTransactionInfo({
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
    await signMultiChain.waitForMultiChainResponse(page);
    await expect(page.locator('#nfw-connect-iframe')).toBeVisible();
    await expect(getFastAuthIframe(page).getByText('You are not authenticated or there has been an indexer failure')).toBeVisible();
  });

  test('Should Pass: Send ETH with Personal Key', async () => {
    test.slow();
    const walletSelector = page.locator('#ws-loaded');
    await expect(walletSelector).toBeVisible();

    await overridePasskeyFunctions(page, {
      creationKeypair:  fakKeyPair,
      retrievalKeypair: fakKeyPair
    });
    await signMultiChain.submitTransactionInfo({
      keyType: 'personalKey', assetType: 'eth', amount: 0.001, address: receivingAddresses.ETH_BNB
    });
    const frame = getFastAuthIframe(page);
    await frame.locator('text=Send 0.001 ETH').waitFor({ state: 'visible' });
    await signMultiChain.clickApproveButton(frame);
    const multiChainResponse = await signMultiChain.waitForMultiChainResponse(page);
    expect(multiChainResponse.transactionHash).toBeDefined();
    expect(multiChainResponse).toHaveProperty('message');
    expect(multiChainResponse.message).toBe('Successfully signed and sent transaction');
    await expect(page.locator('#nfw-connect-iframe')).not.toBeVisible();
    await expect(page.locator('#nfw-connect-iframe')).not.toBeVisible();
  });

  test('Should Pass: Send BNB with domain Key', async () => {
    test.slow();
    const walletSelector = page.locator('#ws-loaded');
    await expect(walletSelector).toBeVisible();

    await overridePasskeyFunctions(page, {
      creationKeypair:  fakKeyPair,
      retrievalKeypair: fakKeyPair
    });
    await signMultiChain.submitTransactionInfo({
      keyType: 'domainKey', assetType: 'bnb', amount: 0.0001, address: receivingAddresses.ETH_BNB
    });
    const multiChainResponse = await signMultiChain.waitForMultiChainResponse(page);
    expect(multiChainResponse.transactionHash).toBeDefined();
    expect(multiChainResponse).toHaveProperty('message');
    expect(multiChainResponse.message).toBe('Successfully signed and sent transaction');
    await expect(page.locator('#nfw-connect-iframe')).not.toBeVisible();
  });

  test('Should Fail: Insufficient Funds with Unknown Key + BTC', async () => {
    test.slow();
    const walletSelector = page.locator('#ws-loaded');
    await expect(walletSelector).toBeVisible();

    await overridePasskeyFunctions(page, {
      creationKeypair:  fakKeyPair,
      retrievalKeypair: fakKeyPair
    });
    await signMultiChain.submitTransactionInfo({
      keyType: 'unknownKey', assetType: 'btc', amount: 0.01, address: receivingAddresses.BTC
    });
    const multiChainResponse = await signMultiChain.waitForMultiChainResponse(page);
    expect(multiChainResponse).toHaveProperty('message');
    expect(multiChainResponse.message).toContain('Invalid transaction');
    await expect(page.locator('#nfw-connect-iframe')).not.toBeVisible();
  });
});
