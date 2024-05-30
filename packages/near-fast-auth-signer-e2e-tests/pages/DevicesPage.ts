import { expect, Page } from '@playwright/test';

class DevicesPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async isCheckboxLoaded(numberOfCheckboxes: number) {
    await expect(this.page.locator('input[type="checkbox"]')).toHaveCount(numberOfCheckboxes, { timeout: 30000 });
  }

  async selectAndDelete(numberOfCheckboxes: number) {
    const checkboxes = this.page.locator('input[type="checkbox"]');
    for (let i = 0; i < numberOfCheckboxes; i += 1) {
      const element = checkboxes.nth(i);
      /* eslint-disable no-await-in-loop */
      await element.click();
      await expect(element).toBeChecked();
    }

    if (numberOfCheckboxes === 1) {
      await this.page.getByRole('button', { name: 'Delete key' }).click();
    } else {
      await this.page.getByRole('button', { name: 'Delete keys' }).click();
    }
  }
}

export default DevicesPage;
