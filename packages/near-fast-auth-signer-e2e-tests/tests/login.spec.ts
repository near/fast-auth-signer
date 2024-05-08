import { expect, test } from '@playwright/test';

import { getFirebaseAuthLink, getRandomEmailAndAccountId } from '../utils/email';
import { createPasskey, setupVirtualAuthenticator } from '../utils/VirtualAuthenticator';

test('should create account and login with e-mail', async ({ page, baseURL }) => {
  const readUIDLS = [];

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

  const createAccountData = await getFirebaseAuthLink(email, readUIDLS, {
    user:     process.env.MAILTRAP_USER,
    password: process.env.MAILTRAP_PASS,
    host:     'pop3.mailtrap.io',
    port:     9950,
    tls:      false
  });

  readUIDLS.push(createAccountData.uidl);

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

  const loginData = await getFirebaseAuthLink(email, readUIDLS, {
    user:     process.env.MAILTRAP_USER,
    password: process.env.MAILTRAP_PASS,
    host:     'pop3.mailtrap.io',
    port:     9950,
    tls:      false
  });

  expect(loginData.link).toBeTruthy();

  await page.goto(loginData.link);

  await expect(page.getByText('User is logged in')).toBeVisible({ timeout: 800000 });
});

// The problem of this test it's that it may end up on remove device screen and be non deterministic. So I included this test on the create account.
// test('should login with email', async ({ page, baseURL }) => {
//   test.slow();
//   const email = 'dded070de3-903595+xfsqk5ydbycljjl@inbox.mailtrap.io';

//   await page.goto(baseURL);

//   const { client, authenticatorId } = await setupVirtualAuthenticator(page);

//   await createPasskey(
//     {
//       client,
//       authenticatorId,
//       email,
//       rpId: baseURL,
//     }
//   );

//   await expect(page.getByText('User is logged in')).not.toBeVisible();

//   await page.getByRole('button', { name: 'Sign In' }).click();
//   const fastAuthIframe = page.frameLocator('#nfw-connect-iframe');

//   await fastAuthIframe.getByRole('textbox', { name: 'Email' }).click();
//   await expect(fastAuthIframe.getByText('Failed to authenticate, please retry with emai')).toBeVisible();
//   await fastAuthIframe.getByRole('textbox', { name: 'Email' }).fill(email);

//   let credentials = await client.send('WebAuthn.getCredentials', {
//     authenticatorId,
//   });

//   // Prints two credential
//   // eslint-disable-next-line no-restricted-syntax
//   for (const c of credentials.credentials) {
//     console.log(c);
//   }

//   await fastAuthIframe.getByRole('button', { name: 'Continue' }).click();

//   const loginData = await getFirebaseAuthLink(email, {
//     user:     process.env.MAILTRAP_USER,
//     password: process.env.MAILTRAP_PASS,
//     host:     'pop3.mailtrap.io',
//     port:     9950,
//     tls:      false
//   });

//   expect(loginData).toBeTruthy();

//   credentials = await client.send('WebAuthn.getCredentials', {
//     authenticatorId,
//   });

//   // Prints two credential
//   // eslint-disable-next-line no-restricted-syntax
//   for (const c of credentials.credentials) {
//     console.log(c);
//   }

//   await page.goto(loginData.link);

//   await expect(page.getByText('User is logged in')).toBeVisible({ timeout: 800000 });

//   await expect(page.getByText('User is logged in')).not.toBeVisible();

//   await page.getByRole('button', { name: 'Sign In' }).click();

//   await fastAuthIframe.getByRole('textbox', { name: 'Email' }).click();

//   credentials = await client.send('WebAuthn.getCredentials', {
//     authenticatorId,
//   });

//   // Prints two credential
//   // eslint-disable-next-line no-restricted-syntax
//   for (const c of credentials.credentials) {
//     console.log(c);
//   }

//   await expect(page.getByText('User is logged in')).toBeVisible({ timeout: 800000 });
// });

// test('should login with passkey', async ({ page }) => {
//   test.slow();

//   await page.goto('http://localhost:3002/');
// });
