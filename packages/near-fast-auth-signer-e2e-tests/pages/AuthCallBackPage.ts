import { expect, Page } from '@playwright/test';

import { TIMEOUT } from '../utils/constants';
import { getFirebaseAuthLink } from '../utils/email';
import { KeyPairs, overridePasskeyFunctions } from '../utils/passkeys';
import { addToDeleteQueue } from '../utils/queue';

class AuthCallBackPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async handleEmail(email: string, readUIDLs: string[], isRecovery: boolean, keyPairs: KeyPairs): Promise<string> {
    const emailData = await getFirebaseAuthLink(email, readUIDLs, {
      user:     process.env.MAILTRAP_USER,
      password: process.env.MAILTRAP_PASS,
      host:     'pop3.mailtrap.io',
      port:     9950,
      tls:      false
    });

    await overridePasskeyFunctions(this.page, keyPairs);

    if (!isRecovery) {
      // only add to delete queue if it's a new account
      await addToDeleteQueue({ type: 'email', email });
    }

    expect(emailData.link).toBeDefined();
    await this.page.goto(emailData.link);

    if (isRecovery) {
      await expect(this.page.getByText('Recovering account...')).toBeVisible({ timeout: TIMEOUT });
      await expect(this.page.getByText('Recovering account...')).not.toBeVisible({ timeout: TIMEOUT });
    } else {
      await expect(this.page.getByText('Creating account...')).toBeVisible({ timeout: TIMEOUT });
      await expect(this.page.getByText('Creating account...')).not.toBeVisible({ timeout: TIMEOUT });
    }

    return emailData.uidl;
  }
}

export default AuthCallBackPage;
