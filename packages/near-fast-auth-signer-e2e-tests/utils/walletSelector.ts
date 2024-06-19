import { expect, Page } from 'playwright/test';

export const isWalletSelectorLoaded = async (page: Page) => {
  const walletSelector = await page.getByTestId('app-container');
  await expect(walletSelector).toBeVisible();
};
