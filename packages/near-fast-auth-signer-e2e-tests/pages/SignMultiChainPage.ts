/* eslint-disable class-methods-use-this */

import { expect, Page, Frame } from '@playwright/test';

// These are the derived address for the asset/key type combo below
const derivedAddresses  = {
  BNB_PERSONAL_KEY: '0xdac0011d991233e20fe6de018f7c7c715a4d6498',
  ETH_UNKNOWN_KEY:  '0x1df778a46791d1ada0a256c7ed6956e2c99b7fb4',
  ETH_DOMAIN_KEY:   '0x07df56c5adef01bd85bd229fde1a43e78054c01d',
};

const TIMEOUT = 1000000;

type KeyType = 'domainKey' | 'personalKey' | 'wrongKey';
type AssetType = 'eth' | 'bnb' | 'btc';

type TransactionDetail = {
  keyType: KeyType,
  assetType: AssetType,
  amount: number,
  address: string
}

const assetSymbolMap = {
  eth:   'ETH',
  btc:  'BTC',
  bnb: 'BNB',
};

class SignMultiChainPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Simulate transaction
  async submitTransaction(values: TransactionDetail) {
    await this.enterTransactionDetails(values);
    await this.verifyTransactionDetails(values);
  }

  async enterTransactionDetails({
    keyType, assetType, amount, address
  }: TransactionDetail) {
    await this.page.locator(`input[name="keyType"][value="${keyType}"]`).click();
    await this.page.locator(`input[name="assetType"][id="${assetType.toLowerCase()}"]`).click();
    await this.page.locator('input[name="amount"]').fill(`${amount}`);
    await this.page.locator('input[name="address"]').fill(`${address}`);
    await this.page.getByRole('button', { name: 'Submit' }).click();
  }

  async verifyTransactionDetails({
    keyType, assetType, amount
  }: TransactionDetail) {
    const frame = await this.waitForIframeModal();
    if (keyType === 'domainKey') return;

    const symbol = assetSymbolMap[assetType.toLowerCase()];

    await frame.locator(`text=Send ${amount} ${symbol}`).waitFor({ state: 'visible' });
    await frame.locator('button:has-text("Approve")').waitFor({ state: 'visible' });

    if (keyType === 'wrongKey') {
      await this.handleWrongKeyTransaction(frame);
    }
  }

  async waitForTransactionDetails(frame: Frame) {
    await frame.locator('div.transaction-details').filter({ hasText: /^https:\/\/app\.unknowndomain\.com$/ }).waitFor({ state: 'visible' });
  }

  async expectWarningMessage(frame: Frame) {
    await expect(frame.getByText('We don’t recognize this app, proceed with caution')).toBeVisible();
  }

  // Expect "Approve button to be disabled and later enabled"
  async expectApprovalButtonDisabled(frame: Frame) {
    await expect(frame.locator('button:has-text("Approve")')).toBeDisabled();
    await frame.locator('input[type="checkbox"]').check();
    await expect(frame.locator('button:has-text("Approve")')).toBeEnabled();
  }

  // Look out for warning message for transaction with an unknown key
  async handleWrongKeyTransaction(frame: Frame) {
    await this.waitForTransactionDetails(frame);
    await this.expectWarningMessage(frame);
    await this.expectApprovalButtonDisabled(frame);
  }

  async waitForIframeModal() {
    const iframeElement = await this.page.locator('#nfw-connect-iframe').elementHandle();
    const frame = await iframeElement.contentFrame();
    if (!frame) {
      throw new Error('Iframe is not available.');
    }
    await frame.waitForURL(/.*\/sign-multichain\//i, { waitUntil: 'networkidle', timeout: TIMEOUT });
    return frame;
  }

  async waitForMessage(page: Page, timeout = 10000) {
    return Promise.race([
      page.evaluate(() => new Promise((resolve) => {
        window.addEventListener('message', (event) => {
          resolve(event.data);
        });
      })),
      new Promise((_, reject) => { setTimeout(() => reject(new Error('Timeout waiting for message event')), timeout); })
    ]);
  }

  async approveTransaction(values: TransactionDetail) {
    await this.submitTransaction(values);
    const frame = await this.waitForIframeModal();
    const buttonLocator = frame.locator('button', { hasText: 'Approve' });
    await buttonLocator.waitFor({ state: 'visible' });
    console.log('Locator found');
    await buttonLocator.click();
    console.log('Locator Clicked');
    const message = await this.waitForMessage(this.page);
    console.log('message ', message);
  }
}

export default SignMultiChainPage;
