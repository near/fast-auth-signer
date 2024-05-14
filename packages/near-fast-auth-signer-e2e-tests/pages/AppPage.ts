import { expect, Page } from '@playwright/test';

const TIMEOUT = 900000;

class AppPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async isLoaded() {
    await expect(this.page.getByText('Wallet selector instance is ready')).toHaveText('Wallet selector instance is ready', { timeout: TIMEOUT });
  }

  async isLoggedIn() {
    await this.isLoaded();
    await expect(this.page.getByText('User is logged in')).toHaveText('User is logged in', { timeout: TIMEOUT });
  }

  async signOut() {
    await this.isLoaded();
    await this.isLoggedIn();
    await this.page.getByRole('button', { name: 'Sign Out' }).click();
  }
}

export default AppPage;
