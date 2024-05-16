import { expect, Page } from '@playwright/test';

import { TIMEOUT } from '../utils/constants';
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

    console.log({
      ...emailData,
      email,
      readUIDLs
    });

    expect(emailData.link).toBeDefined();

    try {
      await this.page.goto(emailData.link, { waitUntil: 'load', timeout: TIMEOUT });

      // Wait for the page to reach a stable state
      await this.page.waitForLoadState('networkidle', { timeout: TIMEOUT });
      await this.page.waitForTimeout(3000);

      // Check the navigation response
      const navigationResponse = await this.page.evaluate(() => document.readyState);
      if (navigationResponse !== 'complete') {
        console.log({ emailData });
        console.error(`Navigation error: Expected 'complete', got '${navigationResponse}'`);

        // Save the page source for debugging
        const visibleText = await this.page.evaluate(() => document.body.innerText);
        console.log({ visibleText });

        // Log any JavaScript errors on the page
        this.page.on('pageerror', (error) => {
          console.error('Page error:', error);
        });

        // Wait for a specific selector or condition (adjust as needed)
        await this.page.waitForSelector('body', { timeout: TIMEOUT });

        // Retry the navigation
        await this.page.reload({ waitUntil: 'networkidle', timeout: TIMEOUT });

        // Re-check the navigation response
        const retryNavigationResponse = await this.page.evaluate(() => document.readyState);
        if (retryNavigationResponse !== 'complete') {
          throw new Error('Navigation to the authentication link failed after retry.');
        }
      }
    } catch (error) {
      console.error('Navigation error:', error);
      throw new Error('Navigation to the authentication link failed.');
    }

    await expect(this.page.getByText('Verifying email...')).toHaveText('Verifying email...', { timeout: TIMEOUT });

    return emailData.uidl;
  }
}

export default AuthCallBackPage;
