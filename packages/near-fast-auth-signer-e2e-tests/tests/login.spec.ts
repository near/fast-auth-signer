import { expect, test } from '@playwright/test';

import EmailBox from '../utils/email';
import { extractLinkFromOnboardingEmail } from '../utils/regex';

test('should login', async ({ page }) => {
  test.slow();

  await page.goto('http://localhost:3002/');

  await expect(page.getByText('User is logged in')).not.toBeVisible();

  await page.getByRole('button', { name: 'Sign In' }).click();
  const fastAuthIframe = page.frameLocator('#nfw-connect-iframe');

  await fastAuthIframe.getByRole('textbox', { name: 'email' }).fill('felipe@near.org');
  await fastAuthIframe.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByText('User is logged in')).toBeVisible({ timeout: 800000 });
});

test('should create account', async ({ page }) => {
  test.slow();

  await page.goto('http://localhost:3002/');

  await expect(page.getByText('User is logged in')).not.toBeVisible();

  await page.getByRole('button', { name: 'Create Account' }).click();
  const fastAuthIframe = page.frameLocator('#nfw-connect-iframe');

  await fastAuthIframe.getByRole('textbox', { name: 'Email' }).fill('ligoti6516@deligy.com');
  await page.waitForResponse('https://rpc.testnet.near.org/');
  await fastAuthIframe.getByRole('textbox', { name: 'user_name', exact: true }).fill('mytextplaceholder');

  await fastAuthIframe.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByText('User is logged in')).toBeVisible({ timeout: 800000 });
});

async function setupVirtualAuthenticator(page) {
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

test('test with CDP', async ({ page }) => {
  const randomPart = Math.random().toString(36).substring(2, 15);
  const email = `dded070de3-903595+${randomPart}@inbox.mailtrap.io`;

  test.slow();

  await setupVirtualAuthenticator(page);

  await page.goto('http://localhost:3002/');

  await expect(page.getByText('User is logged in')).not.toBeVisible();

  await page.getByRole('button', { name: 'Create Account' }).click();
  const fastAuthIframe = page.frameLocator('#nfw-connect-iframe');

  // await fastAuthIframe.getByRole('textbox', { name: 'Email' }).click();
  // await expect(fastAuthIframe.getByText('Failed to authenticate, please retry with emai')).toBeVisible();
  // await fastAuthIframe.getByRole('textbox', { name: 'Email' }).fill(email);

  await fastAuthIframe.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.waitForResponse('https://rpc.testnet.near.org/');
  await fastAuthIframe.getByRole('textbox', { name: 'user_name', exact: true }).fill(randomPart);

  await fastAuthIframe.getByRole('button', { name: 'Continue' }).click();

  let lastEmail = '';
  while (!lastEmail.includes(email)) {
    const mailPop3Box = new EmailBox({
      user:     process.env.MAILTRAP_USER,
      password: process.env.MAILTRAP_PASS,
      host:     'pop3.mailtrap.io',
      port:     9950,
      tls:      false
    });

    // eslint-disable-next-line no-await-in-loop
    await mailPop3Box.establishConnection();

    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => { setTimeout(resolve, 1000); });
    // eslint-disable-next-line no-await-in-loop
    lastEmail = await mailPop3Box.getLastEmail();
  }

  const link = extractLinkFromOnboardingEmail(lastEmail);

  await page.goto(link);

  await expect(page.getByText('User is logged in')).toBeVisible({ timeout: 800000 });
});
