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
      /* eslint-disable no-await-in-loop */
      await element.click();
      await expect(element).toBeChecked();
    }

    await expect(this.page.getByRole('button', { name: 'Delete key' })).toBeVisible({ timeout: TIMEOUT });
    await this.page.getByRole('button', { name: 'Delete key' }).click({ timeout: TIMEOUT });
    await expect(this.page.getByRole('button', { name: 'Deleting...' })).not.toBeVisible({ timeout: TIMEOUT });
  }
}

export default DevicesPage;
