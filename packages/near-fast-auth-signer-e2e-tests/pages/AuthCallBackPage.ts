import { expect, Page } from '@playwright/test';
import { getEmailId } from 'near-fast-auth-signer/src/utils/form-validation';

import { TIMEOUT } from '../utils/constants';
import { getFirebaseAuthOtp } from '../utils/email';
import { addToDeleteQueue } from '../utils/queue';

class AuthCallBackPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async handleEmail(email: string, readUIDLs: string[], isRecovery: boolean): Promise<string> {
    const emailData = await getFirebaseAuthOtp(email, readUIDLs, {
      user:     process.env.MAILTRAP_USER,
      password: process.env.MAILTRAP_PASS,
      host:     'pop3.mailtrap.io',
      port:     9950,
      tls:      false
    });

    if (!isRecovery) {
      // only add to delete queue if it's a new account
      await addToDeleteQueue({ type: 'email', email });
    }

    await Array.from(emailData.otp).reduce(
      (acc, digit, index) => acc.then(() => this.page.fill(`[data-test-id="otp-input-${index}"]`, digit)),
      Promise.resolve()
    );
    await this.page.click('[data-test-id="submit-otp-button"]');

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
  async handleInPageAccountCreation(email: string) {
    await expect(this.page.getByText('Oops! This account doesn\'t seem to exist. Please create one below.')).toBeVisible();
    await expect(this.page.locator('[data-testid="email_create"]')).toHaveValue(email);
    await expect(this.page.locator('[data-testid="username_create"]')).toHaveValue(getEmailId(email));
    await this.page.waitForSelector('button:has-text("Continue"):enabled');
    await this.page.click('button:has-text("Continue")');
    await this.page.waitForSelector('text=Loading...');
    await this.page.waitForSelector('text=Loading...', { state: 'detached' });
    await this.page.waitForSelector('text=Redirecting to app...');
  }
}

export default AuthCallBackPage;
