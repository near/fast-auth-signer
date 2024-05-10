import { expect, test } from '@playwright/test';
import { KeyPair } from 'near-api-js';

import { getFirebaseAuthLink, getRandomEmailAndAccountId } from '../utils/email';
import { setupIFramePasskeys, setupPagePasskeys } from '../utils/passkeys';

test('should create account and login with e-mail', async ({ page, baseURL }) => {
  test.slow();

  const readUIDLs = [];

  const { email, accountId } = getRandomEmailAndAccountId();

  await setupPagePasskeys(page, {
    isPassKeyAvailable: true,
    returnSameKey:      true,
    keyPairA:           KeyPair.fromRandom('ED25519'),
    keyPairB:           KeyPair.fromRandom('ED25519')
  });

  await page.goto(baseURL);

  await expect(page.getByText('User is logged in')).not.toBeVisible();

  await page.getByRole('button', { name: 'Create Account' }).click();
  const fastAuthIframe = page.frameLocator('#nfw-connect-iframe');

  await fastAuthIframe.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.waitForResponse('https://rpc.testnet.near.org/');
  await fastAuthIframe.getByRole('textbox', { name: 'user_name', exact: true }).fill(accountId);

  await fastAuthIframe.getByRole('button', { name: 'Continue' }).click();

  const createAccountData = await getFirebaseAuthLink(email, readUIDLs, {
    user:     process.env.MAILTRAP_USER,
    password: process.env.MAILTRAP_PASS,
    host:     'pop3.mailtrap.io',
    port:     9950,
    tls:      false
  });

  readUIDLs.push(createAccountData.uidl);

  expect(createAccountData.link).toBeTruthy();

  await page.goto(createAccountData.link);

  await expect(page.getByText('User is logged in')).toBeVisible({ timeout: 900000 });

  await page.getByRole('button', { name: 'Sign Out' }).click();

  await page.goto(baseURL);
  await expect(page.getByText('User is logged in')).not.toBeVisible();

  await setupIFramePasskeys(page, {
    isPassKeyAvailable: true,
    returnSameKey:      true,
    keyPairA:           KeyPair.fromRandom('ED25519'),
    keyPairB:           KeyPair.fromRandom('ED25519')
  });

  await page.getByRole('button', { name: 'Sign In' }).click();

  await fastAuthIframe.getByRole('textbox', { name: 'Email' }).click({ delay: 1000 });
  await fastAuthIframe.getByRole('textbox', { name: 'Email' }).fill(email);

  await fastAuthIframe.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByRole('button', { name: 'Resend' })).toBeVisible();

  const loginData = await getFirebaseAuthLink(email, readUIDLs, {
    user:     process.env.MAILTRAP_USER,
    password: process.env.MAILTRAP_PASS,
    host:     'pop3.mailtrap.io',
    port:     9950,
    tls:      false
  });

  expect(loginData.link).toBeTruthy();

  await setupPagePasskeys(page, {
    isPassKeyAvailable: true,
    returnSameKey:      true,
    keyPairA:           KeyPair.fromRandom('ED25519'),
    keyPairB:           KeyPair.fromRandom('ED25519')
  });

  await page.goto(loginData.link);

  await expect(page.getByText('User is logged in')).toBeVisible({ timeout: 900000 });
});

test('should login with passkeys', async ({ page, baseURL }) => {
  test.slow();

  const readUIDLs = [];

  const { email, accountId } = getRandomEmailAndAccountId();

  await page.goto(baseURL);

  await expect(page.getByText('User is logged in')).not.toBeVisible();

  await page.getByRole('button', { name: 'Create Account' }).click();
  const fastAuthIframe = page.frameLocator('#nfw-connect-iframe');

  await fastAuthIframe.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.waitForResponse('https://rpc.testnet.near.org/');
  await fastAuthIframe.getByRole('textbox', { name: 'user_name', exact: true }).fill(accountId);

  await fastAuthIframe.getByRole('button', { name: 'Continue' }).click();

  const createAccountData = await getFirebaseAuthLink(email, readUIDLs, {
    user:     process.env.MAILTRAP_USER,
    password: process.env.MAILTRAP_PASS,
    host:     'pop3.mailtrap.io',
    port:     9950,
    tls:      false
  });

  readUIDLs.push(createAccountData.uidl);

  expect(createAccountData.link).toBeTruthy();

  const keyPair = KeyPair.fromRandom('ED25519');

  await setupPagePasskeys(page, {
    isPassKeyAvailable: true,
    returnSameKey:      true,
    keyPairA:           keyPair,
    keyPairB:           keyPair
  });

  await page.goto(createAccountData.link);

  await page.getByRole('button', { name: 'Sign Out' }).click();

  await page.goto(baseURL);

  await setupIFramePasskeys(page, {
    isPassKeyAvailable: true,
    returnSameKey:      true,
    keyPairA:           keyPair,
    keyPairB:           keyPair
  });

  await expect(page.getByText('User is logged in')).not.toBeVisible();

  await page.getByRole('button', { name: 'Sign In' }).click();

  await fastAuthIframe.getByRole('textbox', { name: 'Email' }).click({ delay: 1000 });

  await expect(page.getByText('User is logged in')).toBeVisible({ timeout: 900000 });
});

test('should login with passkey', async ({ page }) => {
  test.slow();

  await page.goto('http://localhost:3002/');
});

test('should not be able to login without account', async ({ page }) => {
  test.slow();

  await page.goto('http://localhost:3002/');
});
