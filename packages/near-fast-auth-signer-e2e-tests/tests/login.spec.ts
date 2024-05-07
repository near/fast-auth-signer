import { expect, test } from '@playwright/test';
import POP3Client from 'mailpop3';

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

function setupMailPop3Box(config: {
  user: string;
  password: string;
  host: string;
  port: number;
  tls: boolean;
}) {
  const {
    user, password, host, port, tls
  } = config;
  const client = new POP3Client(port, host, {
    tlserrs:   false,
    enabletls: tls,
    debug:     true
  });

  client.on('error', (err) => {
    console.error('Error:', err);
  });

  client.on('connect', () => {
    console.log('CONNECT success');
    client.login(user, password);
  });

  client.on('login', (status) => {
    if (status) {
      console.log('LOGIN/PASS success');
      client.list();
    } else {
      console.log('LOGIN/PASS failed');
      client.quit();
    }
  });

  client.on('list', (status, msgcount) => {
    if (status) {
      console.log(`LIST success with ${msgcount} element(s)`);
    } else {
      console.log('LIST failed');
      client.quit();
    }
  });

  client.on('quit', (status) => {
    if (status) console.log('QUIT success');
    else console.log('QUIT failed');
  });
}

test('test with CDP', async ({ page }) => {
  test.slow();

  setupMailPop3Box({
    user:     'e94a08c7daa38a',
    password: process.env.MAILTRAP_PASS,
    host:     'pop3.mailtrap.io',
    port:     9950,
    tls:      false
  });

  await setupVirtualAuthenticator(page);

  await page.goto('http://localhost:3002/');

  await expect(page.getByText('User is logged in')).not.toBeVisible();

  await page.getByRole('button', { name: 'Sign In' }).click();
  const fastAuthIframe = page.frameLocator('#nfw-connect-iframe');

  await fastAuthIframe.getByRole('textbox', { name: 'Email' }).click();
  await expect(fastAuthIframe.getByText('Failed to authenticate, please retry with emai')).toBeVisible();
  await fastAuthIframe.getByRole('textbox', { name: 'Email' }).fill('dded070de3-903595@inbox.mailtrap.io');
  await fastAuthIframe.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByText('User is logged in')).toBeVisible({ timeout: 800000 });
});
