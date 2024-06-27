/* eslint-disable class-methods-use-this */

import { Page } from '@playwright/test';

import { getFastAuthIframe } from '../../utils/constants';

type KeyType = 'domainKey' | 'personalKey' | 'unknownKey';
type AssetType = 'eth' | 'bnb' | 'btc';

interface MultiChainResponse {
  transactionHash?: string;
  message: string;
}

type TransactionDetail = {
  keyType: KeyType,
  assetType: AssetType,
  amount: number,
  address: string
}

class SignMultiChain {
  private readonly page: Page;

  private isWebkit: boolean;

  constructor(page: Page) {
    this.page = page;
    this.isWebkit = false;
  }

  // Wait for about 4 minutes to get multichain response
  async waitForMultiChainResponse(timeout = 240000) {
    return await Promise.race([
      this.page.evaluate(() => new Promise((resolve) => {
        window.addEventListener('message', (event) => {
          if (event.data.type === 'multiChainResponse') resolve(event.data);
        });
      })),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout waiting for multiChainResponse message event')), timeout);
      })
    ]) as Promise<MultiChainResponse>;
  }

  async submitTransaction({
    keyType, assetType, amount, address
  }: TransactionDetail) {
    await this.page.check(`input#${keyType}`);
    await this.page.check(`input#${assetType.toLowerCase()}`);
    await this.page.fill('input#amount', `${amount}`);
    await this.page.fill('input#address', `${address}`);
    await this.page.click('button[type="submit"]');

    // Webkit browsers only trigger submit if button is double-clicked, this is only happening with our test dapp
    /* if (this.isWebkit && !process.env.CI) {
      await this.page.dblclick('button[type="submit"]');
    } else {
      await this.page.click('button[type="submit"]');
    } */
  }

  async clickApproveButton() {
    const frame = getFastAuthIframe(this.page);
    const approveButton = frame.locator('button:has-text("Approve")');
    await approveButton.waitFor();
    await approveButton.click();
  }

  async submitAndApproveTransaction({
    keyType, assetType, amount, address
  }: TransactionDetail) {
    await this.submitTransaction({
      keyType, assetType, amount, address
    });
    await this.clickApproveButton();
  }

  // Disable pointer events on overlay elements within the iframe and page
  async disablePointerEventsInterruption() {
    await this.page.addStyleTag({ content: 'iframe#webpack-dev-server-client-overlay { pointer-events: none; z-index: -1; }' });
  }

  setIsWebkit(isWebkit: boolean) {
    this.isWebkit = isWebkit;
  }
}

export default SignMultiChain;
