import { expect, test } from '@playwright/test';
import Imap from 'imap';
import Pop3Command from 'node-pop3';

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

function setupEmailBox({
  user,
  password,
  host,
  port,
  tls
}: {
  user: string;
  password: string;
  host: string;
  port: number;
  tls: boolean;
}) {
  const imap = new Imap({
    user,
    password,
    host,
    port,
    tls,
  });

  function openInbox(cb) {
    imap.openBox('INBOX', true, cb);
  }

  imap.once('ready', () => {
    openInbox((err, box) => {
      if (err) throw err;
      console.log('Inbox opened');

      // Listen for new mail event
      imap.on('mail', (numNewMsgs) => {
        console.log('New mail arrived:', numNewMsgs);
        // Perform any desired actions with the new mail
        // For example, you can fetch the new messages or update your application state
      });
    });
  });

  imap.once('error', (err) => {
    console.log('IMAP connection error:', err);
  });

  imap.once('end', () => {
    console.log('IMAP connection ended');
  });

  imap.connect();
}

async function setupPop3Box({
  user,
  password,
  host,
}: {
  user: string;
  password: string;
  host: string;
}) {
  const pop3 = new Pop3Command({
    user,
    password,
    host,
  });

  let retrievedUIDs = [];

  async function checkForNewEmails() {
    try {
      console.log('1');
      await pop3.connect();
      console.log('2');
      const list = await pop3.UIDL();

      console.log('3');
      console.log(list);

      const newUIDs = list.filter((item) => !retrievedUIDs.includes(item[1]));
      if (newUIDs.length > 0) {
        console.log(`Found ${newUIDs.length} new email(s)`);
        retrievedUIDs = list.map((item) => item[1]);
      }

      await pop3.QUIT();
    } catch (err) {
      console.log('Error:', err);
    }
  }

  console.log('called');
  setInterval(checkForNewEmails, 1000);
}

async function setupMailPop3Box({
  user,
  password,
  host,
  port,
  tls
}: {
  user: string;
  password: string;
  host: string;
  port: number;
  tls: boolean;
}) {
  const POP3Client = require('mailpop3');
  const client = new POP3Client(port, host, {
    tlserrs:   false,
    enabletls: tls,
    debug:     true
  });

  client.on('error', (err) => {
    if (err.errno === 111) console.log('Unable to connect to server');
    else console.log('Server error occurred');
    console.log(err);
  });

  client.on('connect', () => {
    console.log('CONNECT success');
    client.login(user, password);
  });

  client.on('login', (status, rawdata) => {
    if (status) {
      console.log('LOGIN/PASS success');
      client.list();
    } else {
      console.log('LOGIN/PASS failed');
      client.quit();
    }
  });

  client.on('list', (status, msgcount, msgnumber, data, rawdata) => {
    if (status === false) {
      console.log('LIST failed');
      client.quit();
    } else {
      console.log(`LIST success with ${msgcount} element(s)`);
      if (msgcount > 0) client.retr(1);
      else client.quit();
    }
  });

  client.on('retr', (status, msgnumber, data, rawdata) => {
    if (status === true) {
      console.log(`RETR success for msgnumber ${msgnumber}`);
      client.dele(msgnumber);
      client.quit();
    } else {
      console.log(`RETR failed for msgnumber ${msgnumber}`);
      client.quit();
    }
  });

  client.on('dele', (status, msgnumber, data, rawdata) => {
    if (status === true) {
      console.log(`DELE success for msgnumber ${msgnumber}`);
      client.quit();
    } else {
      console.log(`DELE failed for msgnumber ${msgnumber}`);
      client.quit();
    }
  });

  client.on('quit', (status, rawdata) => {
    if (status === true) console.log('QUIT success');
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
