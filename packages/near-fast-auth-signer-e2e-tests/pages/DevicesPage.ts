import { expect, Page } from '@playwright/test';

import { TIMEOUT } from '../utils/constants';

class DevicesPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async isCheckboxLoaded(numberOfCheckboxes: number) {
    await this.page.waitForSelector('input[type="checkbox"]', { state: 'visible', timeout: TIMEOUT });
    await expect(this.page.locator('input[type="checkbox"]')).toHaveCount(numberOfCheckboxes);
  }

  async selectAndDelete(numberOfCheckboxes: number) {
    await this.page.waitForSelector('input[type="checkbox"]', { state: 'visible' });
    await expect(this.page.getByRole('button', { name: 'Delete key' })).toBeVisible({ timeout: TIMEOUT });
    const checkboxes = this.page.locator('input[type="checkbox"]');
    for (let i = 0; i < numberOfCheckboxes; i += 1) {
      const element = checkboxes.nth(i);
      if (element !== null) {
        /* eslint-disable no-await-in-loop */
        await element.waitFor({ state: 'visible' });
        await element.click();
      }
    }

    await this.page.getByRole('button', { name: 'Delete key' }).click({ timeout: TIMEOUT, force: true });
  }
}

export default DevicesPage;
