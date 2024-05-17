import { expect, Page } from '@playwright/test';

import { TIMEOUT } from '../utils/constants';

class EmailPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async hasLoaded() {
    await expect(this.page.getByRole('button', { name: 'Resend' })).toHaveText('Resend', { timeout: TIMEOUT });
  }
}

export default EmailPage;
