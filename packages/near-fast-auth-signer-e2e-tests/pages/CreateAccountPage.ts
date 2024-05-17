import { Page } from '@playwright/test';

import { getFastAuthIframe } from '../utils/constants';

class LoginPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async createAccount(
    email: string,
    accountId: string,
  ) {
    await this.page.getByRole('button', { name: 'Create Account' }).click();
    const fastAuthIframe = getFastAuthIframe(this.page);

    await fastAuthIframe.getByRole('textbox', { name: 'Email' }).fill(email);
    await this.page.waitForResponse('https://rpc.testnet.near.org/');
    await fastAuthIframe.getByRole('textbox', { name: 'user_name', exact: true }).fill(accountId);
    await fastAuthIframe.getByRole('button', { name: 'Continue' }).click();
  }
}

export default LoginPage;
