import { expect, Page } from '@playwright/test';
import { getEmailId } from 'near-fast-auth-signer/src/utils/form-validation';

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

  // eslint-disable-next-line class-methods-use-this
  async handleInPageAccountCreation(email: string, page: Page) {
    await expect(page.getByText('Oops! This account doesn\'t seem to exist. Please create one below.')).toBeVisible();
    await expect(page.locator('[data-testid="email_create"]')).toHaveValue(email);
    await expect(page.locator('[data-testid="username_create"]')).toHaveValue(getEmailId(email));
    await page.waitForSelector('button:has-text("Continue"):enabled');
    await page.click('button:has-text("Continue")');
    await expect(page.getByText('Loading...')).toBeVisible({ timeout: TIMEOUT });
    await expect(page.getByText('Loading...')).not.toBeVisible({ timeout: TIMEOUT });
    await expect(page.getByText('Redirecting to app...')).toBeVisible({ timeout: TIMEOUT });
  }
}

export default AuthCallBackPage;
