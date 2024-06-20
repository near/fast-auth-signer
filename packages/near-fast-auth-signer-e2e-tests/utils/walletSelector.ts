import { expect, Page } from 'playwright/test';

export const isWalletSelectorLoaded = async (page: Page) => {
  const walletSelector = page.getByTestId('app-container');
  await expect(walletSelector).toBeVisible();
};
