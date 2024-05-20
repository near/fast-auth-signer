import { Page } from '@playwright/test';

import { checkConditionUntilMet } from '../utils/async';

class DevicesPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async getCount() {
    const checkboxes = this.page.locator('input[type="checkbox"]');
    return checkboxes.count();
  }

  async selectAndDelete() {
    const checkFunction = async () => {
      const count = await this.getCount();
      return count > 0;
    };
    // Wait until it loads records and it is available for an action
    await checkConditionUntilMet(this.page, checkFunction, 5, 1000);
    const checkboxes = this.page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();

    for (let i = 0; i < count; i += 1) {
      const element = checkboxes.nth(i);
      /* eslint-disable no-await-in-loop */
      await element.click();
    }

    await this.page.getByRole('button', { name: 'Delete Key' }).click();
  }
}

export default DevicesPage;
