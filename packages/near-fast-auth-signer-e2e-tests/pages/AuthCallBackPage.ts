import { expect, Page } from '@playwright/test';

import { getFirebaseAuthLink } from '../utils/email';
import { setupPasskeysFunctions, SetupPasskeysFunctionsConfig } from '../utils/passkeys';

class AuthCallBackPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async handleEmail(email: string, readUIDLs: string[], passkeysConfig: SetupPasskeysFunctionsConfig): Promise<string> {
    const createAccountData = await getFirebaseAuthLink(email, readUIDLs, {
      user:     process.env.MAILTRAP_USER,
      password: process.env.MAILTRAP_PASS,
      host:     'pop3.mailtrap.io',
      port:     9950,
      tls:      false
    });

    setupPasskeysFunctions(this.page, 'page', passkeysConfig);

    expect(createAccountData.link).toBeTruthy();

    await this.page.goto(createAccountData.link);

    return createAccountData.uidl;
  }
}

export default AuthCallBackPage;
