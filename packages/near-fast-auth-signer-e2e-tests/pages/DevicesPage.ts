import { expect, Page } from '@playwright/test';

class DevicesPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async selectAndDelete() {
    // Wait until it loads records and it is available for an action
    await expect(this.page.locator('input[type="checkbox"]')).toHaveCount(5, {timeout: 20000});
    const checkboxes = this.page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();

    await Promise.all(
      Array.from({ length: count }, (_, i) => checkboxes.nth(i).click())
    );

    await this.page.getByRole('button', { name: 'Delete Key' }).click();
  }
}

export default DevicesPage;
