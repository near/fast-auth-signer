import { expect, Page } from '@playwright/test';

import { TIMEOUT } from '../utils/constants';

class DevicesPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async isCheckboxLoaded(numberOfCheckboxes: number) {
    await expect(this.page.locator('input[type="checkbox"]')).toHaveCount(numberOfCheckboxes, { timeout: TIMEOUT });
  }

  async selectAndDelete(numberOfCheckboxes: number) {
    const checkboxes = this.page.locator('input[type="checkbox"]');
    for (let i = 0; i < numberOfCheckboxes; i += 1) {
      const element = checkboxes.nth(i);
      if (element !== null) {
        /* eslint-disable no-await-in-loop */
        await element.click();
      }
    }

    await this.page.getByRole('button', { name: 'Delete key' }).click({ timeout: TIMEOUT });
  }
}

export default DevicesPage;
