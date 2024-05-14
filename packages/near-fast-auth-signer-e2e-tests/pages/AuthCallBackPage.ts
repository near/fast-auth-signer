import { expect, Page } from '@playwright/test';

import { getFirebaseAuthLink } from '../utils/email';
import { setupPasskeysFunctions, SetupPasskeysFunctionsConfig } from '../utils/passkeys';

class AuthCallBackPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async handleEmail(email: string, readUIDLs: string[], passkeysConfig: SetupPasskeysFunctionsConfig): Promise<string> {
    const emailData = await getFirebaseAuthLink(email, readUIDLs, {
      user:     process.env.MAILTRAP_USER,
      password: process.env.MAILTRAP_PASS,
      host:     'pop3.mailtrap.io',
      port:     9950,
      tls:      false
    });

    setupPasskeysFunctions(this.page, 'page', passkeysConfig);

    await this.page.goto(emailData.link);

    await expect(this.page.getByText('Verifying email...')).toHaveText('Verifying email...', { timeout: 90000 });

    return emailData.uidl;
  }
}

export default AuthCallBackPage;
