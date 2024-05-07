import { expect, Page, test } from '@playwright/test';

import { getLastEmail, getRandomEmailAndAccountId } from '../utils/email';
import { extractLinkFromOnboardingEmail } from '../utils/regex';

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

  // await fastAuthIframe.getByRole('textbox', { name: 'Email' }).click();
  // await expect(fastAuthIframe.getByText('Failed to authenticate, please retry with emai')).toBeVisible();
  // await fastAuthIframe.getByRole('textbox', { name: 'Email' }).fill(email);

  await fastAuthIframe.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.waitForResponse('https://rpc.testnet.near.org/');
  await fastAuthIframe.getByRole('textbox', { name: 'user_name', exact: true }).fill(accountId);

  await fastAuthIframe.getByRole('button', { name: 'Continue' }).click();

  let lastEmail  = '';
  while (!lastEmail?.includes(email)) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => { setTimeout(resolve, 1000); });

    // eslint-disable-next-line no-await-in-loop
    lastEmail = await getLastEmail({
      user:     process.env.MAILTRAP_USER,
      password: process.env.MAILTRAP_PASS,
      host:     'pop3.mailtrap.io',
      port:     9950,
      tls:      false
    });
  }

  const link = extractLinkFromOnboardingEmail(lastEmail);

  await page.goto(link);

  await expect(page.getByText('User is logged in')).toBeVisible({ timeout: 900000 });
});

test('should login with email', async ({ page }) => {
  test.slow();

  await page.goto('http://localhost:3002/');

  await expect(page.getByText('User is logged in')).not.toBeVisible();

  await page.getByRole('button', { name: 'Sign In' }).click();
  const fastAuthIframe = page.frameLocator('#nfw-connect-iframe');

  await fastAuthIframe.getByRole('textbox', { name: 'email' }).fill('felipe@near.org');
  await fastAuthIframe.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByText('User is logged in')).toBeVisible({ timeout: 800000 });
});

test('should login with passkey', async ({ page }) => {
  test.slow();

  await page.goto('http://localhost:3002/');
});
