import { expect, Page } from 'playwright/test';

import { TIMEOUT } from './constants';

export const expectToExist = async (page: Page, text: string, timeout = TIMEOUT) => {
  await expect(page.getByText(text)).toHaveText(text, { timeout });
};
