import { Page } from '@playwright/test';

import { expectToExist } from '../utils/expect';

class AppPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async isLoaded() {
    await expectToExist(this.page, 'Wallet selector instance is ready');
  }

  async isLoggedIn() {
    await this.isLoaded();
    await expectToExist(this.page, 'User is logged in');
  }

  async signOut() {
    await this.isLoaded();
    await this.isLoggedIn();
    await this.page.getByRole('button', { name: 'Sign Out' }).click();
  }
}

export default AppPage;
