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

    console.log(`numberOfCheckboxes: ${numberOfCheckboxes}`);

    await this.page.getByRole('button', { name: 'Delete Key' }).click();
  }
}

export default DevicesPage;
