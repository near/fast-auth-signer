import { test } from '@playwright/test';

test('should login', async ({ page }) => {
  await page.goto('http://localhost:3002/');

  await page.getByRole('button', { name: 'Sign In' }).click();
  const fastAuthIframe = page.frameLocator('#nfw-connect-iframe');
  await fastAuthIframe.getByRole('button', { name: 'Continue' }).click();

  await page.waitForTimeout(20000);
});
