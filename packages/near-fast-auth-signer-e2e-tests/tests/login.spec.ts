import { expect, test } from '@playwright/test';

import { getFirebaseAuthLink, getRandomEmailAndAccountId } from '../utils/email';
import { createPasskey, setupVirtualAuthenticator } from '../utils/VirtualAuthenticator';

test('should create account and login with e-mail', async ({ page, baseURL }) => {
  const readUIDLs = [];

  test.slow();

  const { email, accountId } = getRandomEmailAndAccountId();

  await setupVirtualAuthenticator(page);

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

  await page.getByRole('button', { name: 'Sign In' }).click();

  await fastAuthIframe.getByRole('textbox', { name: 'Email' }).click();
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

  await page.goto(loginData.link);

  await expect(page.getByText('User is logged in')).toBeVisible({ timeout: 900000 });
});

// The problem of this test it's that it may end up on remove device screen and be non deterministic. So I included this test on the create account.
test('should login with email', async ({ page, baseURL }) => {
  test.slow();
  const { email } = getRandomEmailAndAccountId();

  await page.goto(baseURL);

  const { client, authenticatorId } = await setupVirtualAuthenticator(page);

  await createPasskey(
    {
      client,
      authenticatorId,
      email,
      rpId: baseURL,
    }
  );

  await expect(page.getByText('User is logged in')).not.toBeVisible();

  await page.getByRole('button', { name: 'Sign In' }).click();
  const fastAuthIframe = page.frameLocator('#nfw-connect-iframe');

  await fastAuthIframe.getByRole('textbox', { name: 'Email' }).click();
  await expect(fastAuthIframe.getByText('Failed to authenticate, please retry with emai')).toBeVisible();
  await fastAuthIframe.getByRole('textbox', { name: 'Email' }).fill(email);

  await fastAuthIframe.getByRole('button', { name: 'Continue' }).click();

  const loginData = await getFirebaseAuthLink(email, [], {
    user:     process.env.MAILTRAP_USER,
    password: process.env.MAILTRAP_PASS,
    host:     'pop3.mailtrap.io',
    port:     9950,
    tls:      false
  });

  expect(loginData).toBeTruthy();

  await page.goto(loginData.link);

  await expect(page.getByText('User is logged in')).toBeVisible({ timeout: 800000 });

  await expect(page.getByText('User is logged in')).not.toBeVisible();

  await page.getByRole('button', { name: 'Sign In' }).click();

  await fastAuthIframe.getByRole('textbox', { name: 'Email' }).click();

  await expect(page.getByText('User is logged in')).toBeVisible({ timeout: 800000 });
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

  await page.goto(createAccountData.link);

  await expect(page.getByText('Verifying email...')).toBeVisible();

  await page.evaluate(async () => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/near-api-js@2.1.4/dist/near-api-js.min.js';
    document.head.appendChild(script);

    // Keypair imported from near-api-js CDN
    // @ts-ignore
    window.test = {
      isPassKeyAvailable: async () => true,
      // @ts-ignore
      // eslint-disable-next-line no-undef
      createKey:          async () => window.nearApi.KeyPair.fromRandom('ED25519'),
      // @ts-ignore
      // eslint-disable-next-line no-undef
      getKeys:            async () => [window.nearApi.KeyPair.fromRandom('ED25519'), window.nearApi.KeyPair.fromRandom('ED25519')],
    };
  });

  await expect(page.getByText('User is logged in')).toBeVisible({ timeout: 900000 });

  await page.getByRole('button', { name: 'Sign Out' }).click();

  await page.goto(baseURL);

  await new Promise<void>((resolve) => {
    page.on('frameattached', async (frame) => {
      await frame.evaluate(async () => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/near-api-js@2.1.4/dist/near-api-js.min.js';
        document.head.appendChild(script);

        // Keypair imported from near-api-js CDN
        // @ts-ignore
        window.test = {
          isPassKeyAvailable: async () => true,
          // @ts-ignore
          // eslint-disable-next-line no-undef
          createKey:          async () => window.nearApi.KeyPair.fromRandom('ED25519'),
          // @ts-ignore
          // eslint-disable-next-line no-undef
          getKeys:            async () => [window.nearApi.KeyPair.fromRandom('ED25519'), window.nearApi.KeyPair.fromRandom('ED25519')],
        };
      });
      resolve();
    });
  });

  await expect(page.getByText('User is logged in')).not.toBeVisible();

  await page.getByRole('button', { name: 'Sign In' }).click();

  await fastAuthIframe.getByRole('textbox', { name: 'Email' }).click();

  await fastAuthIframe.getByRole('button', { name: 'Continue' }).click();

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
