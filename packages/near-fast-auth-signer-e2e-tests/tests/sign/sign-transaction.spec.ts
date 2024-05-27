import { Account, Connection, Contract } from '@near-js/accounts';
import { KeyPair } from '@near-js/crypto';
import { InMemoryKeyStore } from '@near-js/keystores';
import { test, expect } from '@playwright/test';

import { getFastAuthIframe } from '../../utils/constants';
import { createAccount, initializeAdmin, isServiceAccountAvailable } from '../../utils/createAccount';
import { setupPasskeysFunctions } from '../../utils/passkeys';
import { TestDapp } from '../models/TestDapp';

const { describe, beforeAll } = test;

let page;
const userFAK = KeyPair.fromRandom('ed25519');
const userLAK = KeyPair.fromRandom('ed25519');
let accountId;

describe('Sign transaction', () => {
  beforeAll(async ({ browser }, { workerIndex }) => {
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

  test('should display signerId, transaction amount, receiverId and args', async () => {
    await page.goto('/');
    const walletSelector = page.locator('#ws-loaded');
    await expect(walletSelector).toBeVisible();
    await page.locator('data-test-id=sign-transaction-button').click();

    await expect(getFastAuthIframe(page).getByText(accountId)).toBeVisible();
    await expect(getFastAuthIframe(page).getByText('0.02 NEAR')).toBeVisible();

    await getFastAuthIframe(page).locator('data-test-id=more-details-button').click();
    await getFastAuthIframe(page).locator('data-test-id=function-call-button').click();

    await expect(getFastAuthIframe(page).getByText(/v1.social08.testnet/)).toBeVisible();
    await expect(getFastAuthIframe(page).getByText(/"fast-auth-e2e-test": "true"/)).toBeVisible();
  });

  test('should fail if signer app is not authenticated', async () => {
    await page.goto('/');
    await setupPasskeysFunctions(page, 'page', {
      isPassKeyAvailable:  false,
      shouldCleanStorage:  false,
    });

    const walletSelector = page.locator('#ws-loaded');
    await expect(walletSelector).toBeVisible();
    await page.locator('data-test-id=sign-transaction-button').click();
    await getFastAuthIframe(page).locator('data-test-id=confirm-transaction-button').click();

    await expect(getFastAuthIframe(page).getByText('You are not authenticated or there has been an indexer failure')).toBeVisible();
  });

  test('should succeed and dismiss when signer app is authenticated', async () => {
    await page.goto('/');
    await setupPasskeysFunctions(page, 'page', {
      isPassKeyAvailable:  true,
      keyPairForCreation:  userFAK,
      keyPairForRetrieval: userFAK,
      shouldCleanStorage:  false,
    });

    const walletSelector = page.locator('#ws-loaded');
    await expect(walletSelector).toBeVisible();
    await page.locator('data-test-id=sign-transaction-button').click();
    await getFastAuthIframe(page).locator('data-test-id=confirm-transaction-button').click();
    const socialdbContract = new Contract(new Account(Connection.fromConfig({
      networkId: 'testnet',
      provider:  { type: 'JsonRpcProvider', args: { url: 'https://rpc.testnet.near.org' } },
      signer:    { type: 'InMemorySigner', keyStore: new InMemoryKeyStore() },
    }), 'dontcare'), 'v1.social08.testnet', {
      viewMethods:   ['get'],
      changeMethods: [],
    }) as Contract & { get: (args) => Promise<string> };

    await expect(getFastAuthIframe(page).getByText('You are not authenticated or there has been an indexer failure')).not.toBeVisible();
    await expect(page.locator('#nfw-connect-iframe')).not.toBeVisible();

    const result = await new Promise((resolve) => { setTimeout(resolve, 5000); }).then(() => socialdbContract.get({ keys: [`${accountId}/**`] }));
    expect(result).toEqual({ [accountId]: { 'fast-auth-e2e-test': 'true' } });
  });
});