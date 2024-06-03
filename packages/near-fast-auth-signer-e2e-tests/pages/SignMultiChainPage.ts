/* eslint-disable class-methods-use-this */

import { expect, Page, Frame } from '@playwright/test';

// Below are the static derived addresses
/* BNB_PERSONAL_KEY => '0xf64750f13f75fb9e2f4d9fd98ab72d742d1e33eb';
ETH_UNKNOWN_KEY => '0xf64750f13f75fb9e2f4d9fd98ab72d742d1e33eb';
ETH_DOMAIN_KEY =>  '0x81d205120a9f04d3f1ce733c5ed0a0bc66714c71'; */

const TIMEOUT = 1000000;

type KeyType = 'domainKey' | 'personalKey' | 'unknownKey';
type AssetType = 'eth' | 'bnb' | 'btc';

interface MessageEventResponse {
  transactionHash?: string;
  message: string;
}

type TransactionDetail = {
  keyType: KeyType,
  assetType: AssetType,
  amount: number,
  address: string
}

const assetSymbolMap = {
  eth: 'ETH',
  btc: 'BTC',
  bnb: 'BNB',
};

class SignMultiChainPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async handleWrongKeyTransaction(frame: Frame) {
    await frame.locator('div.transaction-details').filter({ hasText: /^https:\/\/app\.unknowndomain\.com$/ }).waitFor({ state: 'visible' });
    await expect(frame.getByText('We don’t recognize this app, proceed with caution')).toBeVisible();
    await expect(frame.locator('button:has-text("Approve")')).toBeDisabled();
    await frame.locator('input[type="checkbox"]').check();
    await expect(frame.locator('button:has-text("Approve")')).toBeEnabled();
  }

  async waitForIframeModal() {
    const iframeElement = await this.page.locator('#nfw-connect-iframe').elementHandle();
    const frame = await iframeElement.contentFrame();
    await frame.waitForURL(/.*\/sign-multichain\//i, { waitUntil: 'networkidle', timeout: TIMEOUT });
    return frame;
  }

  async waitForMultiChainResponse(page: Page, timeout = 100000) {
    return await Promise.race([
      page.evaluate(() => new Promise((resolve) => {
        window.addEventListener('message', (event) => {
          if (event.data.type === 'multiChainResponse') resolve(event.data);
        });
      })),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout waiting for message event')), timeout);
      })
    ]) as Promise<MessageEventResponse>;
  }

  async submitTransactionInfo({
    keyType, assetType, amount, address
  }: TransactionDetail) {
    await this.page.check(`input[name="keyType"][value="${keyType}"]`);
    await this.page.check(`input[name="assetType"][id="${assetType.toLowerCase()}"]`);
    await this.page.fill('input[name="amount"]', `${amount}`);
    await this.page.fill('input[name="address"]', `${address}`);
    await this.page.click('button[type="submit"]');
  }

  async clickApproveButton(parent: Frame | Page) {
    const approveButton = parent.locator('button', { hasText: 'Approve' });
    await approveButton.waitFor();
    await approveButton.click();
  }

  async submitAndApproveTransaction({
    keyType, assetType, amount, address
  }: TransactionDetail) {
    await this.submitTransactionInfo({
      keyType, assetType, amount, address
    });
    const frame = await this.waitForIframeModal();
    await this.clickApproveButton(frame);
  }
}

export default SignMultiChainPage;
