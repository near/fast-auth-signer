import { CDPSession, Page } from 'playwright/test';

export async function setupVirtualAuthenticator(page: Page) {
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

export async function createPasskey({
  client,
  email,
  authenticatorId,
  rpId,
}: {
  client: CDPSession;
  email: string;
  authenticatorId: string;
  rpId: string;
}): Promise<string> {
  const keyPair = (await crypto.subtle.generateKey(
    {
      name:       'ECDSA',
      namedCurve: 'P-256',
    },
    true,
    ['sign', 'verify']
  ));

  const pkcs8PrivateKey = (await crypto.subtle.exportKey(
    'pkcs8',
    keyPair.privateKey
  )) as ArrayBuffer;

  const base64PrivateKey = btoa(
    String.fromCharCode.apply(null, new Uint8Array(pkcs8PrivateKey))
  );

  const credentialId = crypto.randomUUID();

  const userHandle = btoa(email);

  const credential = {
    credentialId:         btoa(credentialId),
    isResidentCredential: true,
    privateKey:           base64PrivateKey,
    signCount:            0,
    userHandle,
    rpId,
  };

  await client.send('WebAuthn.addCredential', {
    authenticatorId,
    credential,
  });

  return btoa(credentialId);
}
