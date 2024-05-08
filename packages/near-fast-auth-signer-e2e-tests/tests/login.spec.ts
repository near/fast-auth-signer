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

  let credentials = await client.send('WebAuthn.getCredentials', {
    authenticatorId,
  });

  // Prints two credential
  // eslint-disable-next-line no-restricted-syntax
  for (const c of credentials.credentials) {
    console.log(c);
  }

  await fastAuthIframe.getByRole('button', { name: 'Continue' }).click();

  const loginData = await getFirebaseAuthLink(email, [], {
    user:     process.env.MAILTRAP_USER,
    password: process.env.MAILTRAP_PASS,
    host:     'pop3.mailtrap.io',
    port:     9950,
    tls:      false
  });

  expect(loginData).toBeTruthy();

  credentials = await client.send('WebAuthn.getCredentials', {
    authenticatorId,
  });

  // Prints two credential
  // eslint-disable-next-line no-restricted-syntax
  for (const c of credentials.credentials) {
    console.log(c);
  }

  await page.goto(loginData.link);

  await expect(page.getByText('User is logged in')).toBeVisible({ timeout: 800000 });

  await expect(page.getByText('User is logged in')).not.toBeVisible();

  await page.getByRole('button', { name: 'Sign In' }).click();

  await fastAuthIframe.getByRole('textbox', { name: 'Email' }).click();

  credentials = await client.send('WebAuthn.getCredentials', {
    authenticatorId,
  });

  // Prints two credential
  // eslint-disable-next-line no-restricted-syntax
  for (const c of credentials.credentials) {
    console.log(c);
  }

  await expect(page.getByText('User is logged in')).toBeVisible({ timeout: 800000 });
});

test('random', async ({ page, baseURL }) => {
  const readUIDLs = [];

  test.slow();

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

  await page.addInitScript(() => {
    const script1 = document.createElement('script');
    script1.src = 'https://unpkg.com/bignumber.js';
    document.head.appendChild(script1);

    const script2 = document.createElement('script');
    script2.src = 'https://unpkg.com/cbor-web';
    document.head.appendChild(script2);

    console.log('isUserVerifyingPlatformAuthenticatorAvailable was called');
    window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable = async () => true;

    // This is a mock for the create method
    // const publicKey = {
    //   attestation:            'none',
    //   authenticatorSelection: {
    //     authenticatorAttachment: 'platform',
    //     requireResidentKey:      true,
    //     userVerification:        'preferred'
    //   },
    //   challenge:        new ArrayBuffer(128),
    //   pubKeyCredParams: [
    //     { type: 'public-key', alg: -8 },
    //     { type: 'public-key', alg: -7 },
    //     { type: 'public-key', alg: -257 }
    //   ],
    //   rp: {
    //     id:   'localhost',
    //     name: 'NEAR_API_JS_WEBAUTHN'
    //   },
    //   status:  'ok',
    //   timeout: 90000,
    //   user:    {
    //     displayName: 'xasij31525@facais.com',
    //     id:          new ArrayBuffer(21),
    //     name:        'xasij31525@facais.com'
    //   }
    // };

    navigator.credentials.create = async () => {
      console.log('navigator.credentials.create was called');
      // Example of original return
      // return {
      //   authenticatorAttachment: 'platform',
      //   id:                      'Sxi-QnudaNGk4PZc8E2Msc7MiImyqgaCZphEhzhoOl4',
      //   rawId:                   new ArrayBuffer(32),
      //   response:                {
      //     attestationObject: new ArrayBuffer(194),
      //     clientDataJSON:    new ArrayBuffer(374)
      //   },
      //   type: 'public-key'
      // };
      return {
        authenticatorAttachment: 'platform',
        id:                      `mocked-id-${Math.random().toString(36).substr(2, 9)}`,
        rawId:                   new Uint8Array(16).map(() => Math.floor(Math.random() * 256)).buffer,
        response:                {
          // cbor is available by script tag imported only in this page
          // @ts-ignore
          // eslint-disable-next-line no-undef
          attestationObject: cbor.encode({
            attStmt:  {},
            authData: new Uint8Array(32).map(() => Math.floor(Math.random() * 256)),
            fmt:      'none',
          }).buffer,

          // Docs: https://developer.mozilla.org/en-US/docs/Web/API/AuthenticatorAttestationResponse/attestationObject
          // attestationObject: cbor.encode({
          //   authData: new Uint8Array(32).map(() => Math.floor(Math.random() * 256)),
          //   fmt:      'packed',
          //   attStmt:  {
          //     alg: -7, // Example algorithm identifier for ES256
          //     sig: new Uint8Array(72).map(() => Math.random() * 256), // Mock signature
          //     x5c: [new Uint8Array(256).map(() => Math.random() * 256)] // Mock certificate chain
          //   }
          // }).buffer,
          clientDataJSON:    new TextEncoder().encode(JSON.stringify({
            challenge:                    'qJGfhbymHo0Fn0D2cGViiA_vZ6zfytWkQGWaI3NirK6pD5q2o6qDjPmc7DHcMPrzGyBZzsZQ5ViIw5UVnMsf-SfxAbwxtCrz-2FqJJLnO_FAbQvMWwAyzd6JMoHnJsLJuTvy1WJ9Grhg-NfO9YGdOQzkCKqW3DVNyJKJakyO6vs',
            crossOrigin:                  false,
            origin:                       'http://localhost:3000',
            other_keys_can_be_added_here: 'do not compare clientDataJSON against a template. See https://goo.gl/yabPex',
            type:                         'webauthn.create',
          })).buffer,
        },
        type:                      'public-key',
        getClientExtensionResults: () => { return {}; },
      };
    };

    // Public key provided to get example
    // const publickKey = {
    //   allowCredentials: [],
    //   attestation:      'direct',
    //   challenge:        new ArrayBuffer(128),
    //   rpId:             'localhost',
    //   status:           'ok',
    //   timeout:          90000,
    //   userVerification: 'preferred',
    //   username:         'dontcare'
    // };
    navigator.credentials.get = async () => {
      console.log('navigator.credentials.get was called');
      return {
        authenticatorAttachment: 'platform',
        id:                      '2EEDL1Pc1-k4SIFAId_6bgAQiekmSSxCGQ0pBmVM26M',
        rawId:                   new ArrayBuffer(32),
        response:                {
          authenticatorData: new ArrayBuffer(37),
          clientDataJSON:    new ArrayBuffer(262),
          signature:         new ArrayBuffer(71),
          userHandle:        new ArrayBuffer(15),
        },
        type: 'public-key'
      };
    };
  });

  await page.goto(createAccountData.link);

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
