import { expect, Page, test } from '@playwright/test';

import { getFirebaseAuthLink, getRandomEmailAndAccountId } from '../utils/email';

async function setupVirtualAuthenticator(page: Page) {
  const client = await page.context().newCDPSession(page);
  // Disable UI for automated testing
  await client.send('WebAuthn.enable', { enableUI: false });

  const result = await client.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol:                    'ctap2',
      transport:                   'internal',
      hasResidentKey:              true,
      hasUserVerification:         true,
      isUserVerified:              true,
      automaticPresenceSimulation: true,
    },
  });
  const { authenticatorId } = result;

  client.on('WebAuthn.credentialAdded', () => {
    console.log('WebAuthn.credentialAdded');
  });
  client.on('WebAuthn.credentialAsserted', () => {
    console.log('WebAuthn.credentialAsserted');
  });

  return { client, authenticatorId };
}

test('should create account', async ({ page }) => {
  test.slow();

  const { email, accountId } = getRandomEmailAndAccountId();

  await setupVirtualAuthenticator(page);

  await page.goto('http://localhost:3002/');

  await expect(page.getByText('User is logged in')).not.toBeVisible();

  await page.getByRole('button', { name: 'Create Account' }).click();
  const fastAuthIframe = page.frameLocator('#nfw-connect-iframe');

  await fastAuthIframe.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.waitForResponse('https://rpc.testnet.near.org/');
  await fastAuthIframe.getByRole('textbox', { name: 'user_name', exact: true }).fill(accountId);

  await fastAuthIframe.getByRole('button', { name: 'Continue' }).click();

  const createAccountLink = await getFirebaseAuthLink(email, {
    user:     process.env.MAILTRAP_USER,
    password: process.env.MAILTRAP_PASS,
    host:     'pop3.mailtrap.io',
    port:     9950,
    tls:      false
  });

  expect(createAccountLink).toBeTruthy();

  await page.goto(createAccountLink);

  await expect(page.getByText('User is logged in')).toBeVisible({ timeout: 900000 });

  // Logout user, may be better do that by interface
  await page.evaluate(() => window.localStorage.clear());
  await page.evaluate(() => window.sessionStorage.clear());

  await page.goto('http://localhost:3002/');

  await page.getByRole('button', { name: 'Sign In' }).click();
  const fastAuthIframe2 = page.frameLocator('#nfw-connect-iframe');

  await fastAuthIframe.getByRole('textbox', { name: 'Email' }).click();
  await expect(fastAuthIframe.getByText('Failed to authenticate, please retry with emai')).toBeVisible();
  await fastAuthIframe.getByRole('textbox', { name: 'Email' }).fill(email);

  await fastAuthIframe2.getByRole('button', { name: 'Continue' }).click();

  const loginLink = await getFirebaseAuthLink(email, {
    user:     process.env.MAILTRAP_USER,
    password: process.env.MAILTRAP_PASS,
    host:     'pop3.mailtrap.io',
    port:     9950,
    tls:      false
  });

  expect(loginLink).toBeTruthy();

  await page.goto(loginLink);

  await expect(page.getByText('User is logged in')).toBeVisible({ timeout: 800000 });
});

// The problem of this test it's that it may end up on remove device screen and be non deterministic. So I included this test on the create account.
test('should login with email', async ({ page }) => {
  test.slow();

  await page.goto('http://localhost:3002/');
});

test('should login with passkey', async ({ page }) => {
  test.slow();

  await page.goto('http://localhost:3002/');
});
