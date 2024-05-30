import { Page, expect } from '@playwright/test';
import { KeyPair } from 'near-api-js';

import { getFastAuthIframe } from '../utils/constants';
import { overridePasskeyFunctions } from '../utils/passkeys';

class LoginPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async signInWithEmail(email: string) {
    const fastAuthIframe = getFastAuthIframe(this.page);

    await overridePasskeyFunctions(this.page, {
      creationKeypair:  KeyPair.fromRandom('ED25519'),
      retrievalKeypair: KeyPair.fromRandom('ED25519')
    });

    await this.page.getByRole('button', { name: 'Sign In' }).click();

    await expect(fastAuthIframe.getByRole('button', { name: 'Continue' })).toBeVisible();
    await fastAuthIframe.getByRole('textbox', { name: 'Email' }).click();
    await fastAuthIframe.getByRole('textbox', { name: 'Email' }).focus();
    await expect(fastAuthIframe.getByText('Failed to authenticate, please retry with email')).toBeVisible({ timeout: 10000 });

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
    const fastAuthIframe = getFastAuthIframe(this.page);

    await overridePasskeyFunctions(this.page, {
      creationKeypair:  keyPairForCreation,
      retrievalKeypair: keyPairForRetrieval
    });

    await this.page.getByRole('button', { name: 'Sign In' }).click();

    await fastAuthIframe.getByRole('textbox', { name: 'Email' }).fill('dontcare@gmail.com');
    if (config.shouldClickContinue) {
      await fastAuthIframe.getByRole('textbox', { name: 'Continue' }).click();
    }
  }
}

export default LoginPage;
