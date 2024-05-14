import { expect, Page } from '@playwright/test';

class EmailPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async hasLoaded() {
    await expect(this.page.getByRole('button', { name: 'Resend' })).toBeVisible({ timeout: 30000 });
  }
}

export default EmailPage;
