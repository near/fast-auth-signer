/* eslint-disable class-methods-use-this */

import { Page, Frame } from '@playwright/test';
import { FrameLocator } from 'playwright';

import { getFastAuthIframe } from '../../utils/constants';

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

class SignMultiChain {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async waitForMultiChainResponse(page: Page, timeout = 200000) {
    return await Promise.race([
      page.evaluate(() => new Promise((resolve) => {
        window.addEventListener('message', (event) => {
          if (event.data.type === 'multiChainResponse') resolve(event.data);
        });
      })),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout waiting for multiChain message event')), timeout);
      })
    ]) as Promise<MessageEventResponse>;
  }

  async submitTransactionInfo({
    keyType, assetType, amount, address
  }: TransactionDetail) {
    await this.page.check(`input#${keyType}`);
    await this.page.check(`input#${assetType.toLowerCase()}`);
    await this.page.fill('input#amount', `${amount}`);
    await this.page.fill('input#address', `${address}`);
    await this.page.click('button[type="submit"]');
  }

  async clickApproveButton(parent: Frame | Page | FrameLocator) {
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
    const frame = getFastAuthIframe(this.page);
    await this.clickApproveButton(frame);
  }
}

export default SignMultiChain;
