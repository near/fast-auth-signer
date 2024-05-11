import { Page } from '@playwright/test';
import { KeyPair } from 'near-api-js';

import { getFastAuthIframe } from '../utils/constants';
import { setupPasskeysFunctions } from '../utils/passkeys';

class LoginPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async signInWithEmail(email: string) {
    await setupPasskeysFunctions(this.page, 'iframe', {
      isPassKeyAvailable:  false,
    });

    await this.page.getByRole('button', { name: 'Sign In' }).click();
    const fastAuthIframe = getFastAuthIframe(this.page);
    await fastAuthIframe.getByRole('textbox', { name: 'Email' }).fill(email);
    await fastAuthIframe.getByRole('button', { name: 'Continue' }).click();
  }

  async signInWithKeyPair(
    keyPairForCreation: KeyPair,
    keyPairForRetrieval: KeyPair,
    config: {
      shouldClickContinue: boolean
    }
  ) {
    await setupPasskeysFunctions(this.page, 'iframe', {
      isPassKeyAvailable:  true,
      keyPairForCreation,
      keyPairForRetrieval
    });

    await this.page.getByRole('button', { name: 'Sign In' }).click();
    const fastAuthIframe = getFastAuthIframe(this.page);

    await fastAuthIframe.getByRole('textbox', { name: 'Email' }).click();

    if (config.shouldClickContinue) {
      await fastAuthIframe.getByRole('textbox', { name: 'Continue' }).click();
    }
  }
}

export default LoginPage;
