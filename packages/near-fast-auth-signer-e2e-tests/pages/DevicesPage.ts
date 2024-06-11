import { expect, Page } from '@playwright/test';

class DevicesPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async isCheckboxLoaded(numberOfCheckboxes: number) {
    await this.page.waitForSelector('[data-testid^="devices-checkbox-"]');
    const checkboxes = await this.page.locator('[data-testid^="devices-checkbox-"]');
    const count = await checkboxes.count();
    await expect(count).toBe(numberOfCheckboxes);
  }

  async selectAndDelete(numberOfCheckboxes: number) {
    await this.page.waitForSelector('[data-testid^="devices-checkbox-"]');
    const deleteButtonTarget = this.page.getByTestId('devices-delete-key');
    const checkboxes = await this.page.locator('[data-testid^="devices-checkbox-"]');

    for (let i = 0; i < numberOfCheckboxes; i += 1) {
      /* eslint-disable no-await-in-loop */

      // check to make sure if the checkbox is ready to be clicked
      const checkboxSelector = `[data-testid="devices-checkbox-${i}"]`;
      await this.page.waitForSelector(checkboxSelector, { state: 'visible' });

      await checkboxes.nth(i).scrollIntoViewIfNeeded();
      await checkboxes.nth(i).click();
    }

    await deleteButtonTarget.click({ force: true });
    await expect(deleteButtonTarget).toHaveText('Deleting...');
  }
}

export default DevicesPage;
