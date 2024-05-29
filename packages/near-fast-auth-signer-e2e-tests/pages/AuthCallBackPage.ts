import { expect, Page } from '@playwright/test';

import { getFirebaseAuthLink } from '../utils/email';
import { overridePasskeyFunctions } from '../utils/passkeys';

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

    await overridePasskeyFunctions(this.page, {
      creationKeypair:  passkeysConfig.keyPairForCreation,
      retrievalKeypair: passkeysConfig.keyPairForRetrieval
    });

    expect(emailData.link).toBeDefined();
    await this.page.goto(emailData.link);

    return emailData.uidl;
  }
}

export default AuthCallBackPage;
