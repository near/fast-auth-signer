import { test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Mock the @near-js/biometric-ed25519 module
  await page.route('https://near-relayer-testnet.api.pagoda.co/relay', async (route) => {
    // Modify the request to redirect to the local server
    const url = new URL(route.request().url());
    url.hostname = 'localhost';
    url.port = '3002';
    url.protocol = 'http';

    // Continue the request with the modified URL
    await route.continue({ url: url.toString() });
  });
});

test('should login', async ({ page }) => {
  await page.goto('http://localhost:3030/');

  await page.getByRole('button', { name: 'Sign In' }).click();
  const fastAuthIframe = page.frameLocator('#nfw-connect-iframe');
  await fastAuthIframe.getByRole('button', { name: 'Continue' }).click();
});

// test('should create a biometric key', async ({ page }) => {
//   const fastAuthController = new FastAuthController({
//     accountId: 'test-account',
//     networkId: 'test-network',
//   });

//   const keyPair = await fastAuthController.createBiometricKey();

//   expect(keyPair).toBeInstanceOf(KeyPairEd25519);
//   expect(keyPair.toString()).toBe('ed25519:mock-secret-key');
// });

// test('should get the correct access key', async ({ page }) => {
//   const fastAuthController = new FastAuthController({
//     accountId: 'test-account',
//     networkId: 'test-network',
//   });

//   const keyPair = await fastAuthController.getCorrectAccessKey(
//     new KeyPairEd25519('mock-secret-key-1'),
//     new KeyPairEd25519('mock-secret-key-2')
//   );

//   expect(keyPair).toBeInstanceOf(KeyPairEd25519);
//   expect(keyPair.toString()).toBe('ed25519:mock-secret-key-1');
// });
