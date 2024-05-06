import { test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('https://near-relayer-testnet.api.pagoda.co/relay', async (route) => {
    const url = new URL(route.request().url());
    url.hostname = 'localhost';
    url.port = '3002';
    url.protocol = 'http';

    await route.continue({ url: url.toString() });
  });
});

test('should login', async ({ page }) => {
  await page.goto('http://localhost:3030/');

  await page.getByRole('button', { name: 'Sign In' }).click();
  const fastAuthIframe = page.frameLocator('#nfw-connect-iframe');
  await fastAuthIframe.getByRole('button', { name: 'Continue' }).click();
});
