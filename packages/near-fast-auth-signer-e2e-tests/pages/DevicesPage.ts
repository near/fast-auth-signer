import { Page } from '@playwright/test';

class DevicesPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async selectAndDelete() {
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
