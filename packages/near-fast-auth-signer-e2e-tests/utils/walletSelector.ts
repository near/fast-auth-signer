import { expect, Page } from 'playwright/test';

export const isWalletSelectorLoaded = async (page: Page) => {
  const walletSelector = page.getByTestId('app-container');
  await expect(walletSelector).toBeVisible();
};

export const ensureIframeIsVisible = async (page: Page) => {
  await page.waitForSelector('#nfw-connect-iframe');
  await expect(page.locator('#nfw-connect-iframe')).toBeVisible();
};

export const getIframeElement = async (page: Page) => {
  const iframeElementHandle = await page.$('#nfw-connect-iframe');
  const iframe = await iframeElementHandle.contentFrame();
  await iframe.waitForLoadState('domcontentloaded');
  return iframe;
};
