/* eslint-disable class-methods-use-this */

import { Page } from '@playwright/test';

import { getFastAuthIframe } from '../../utils/constants';

export type KeyType = 'domainKey' | 'personalKey' | 'unknownKey';
export type AssetType = 'eth' | 'bnb' | 'btc';

interface MultiChainResponse {
  transactionHash?: string;
  message: string;
}

type TransactionDetail = {
  keyType: KeyType,
  assetType: AssetType,
  amount: number,
  address: string,
  isFunctionCall?: boolean,
  useLocalRpc?: boolean
}

class SignMultiChain {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
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
    keyType, assetType, amount, address, isFunctionCall, useLocalRpc
  }: TransactionDetail) {
    await this.page.check(`input#${keyType}`);
    await this.page.check(`input#${assetType.toLowerCase()}`);
    await this.page.fill('input#amount', `${amount}`);
    await this.page.fill('input#address', `${address}`);
    if (isFunctionCall) {
      await this.page.check('input#isFunctionCall');
    }
    if (useLocalRpc) {
      await this.page.check('input#useLocalRpc');
    }
    await this.page.click('button[type="submit"]');
  }

  async clickApproveButton() {
    const frame = getFastAuthIframe(this.page);
    const approveButton = frame.locator('button:has-text("Approve")');
    await approveButton.waitFor({ state: 'visible' });
    await approveButton.click();
  }

  async closeModal() {
    // TODO: Consider replacing Ant Design in fast-auth-wallet
    // - Current usage is limited (only 4 components imported in IframeDialog.tsx)
    // - Ant Design limits customization options for elements like this close button
    // - Removing it could reduce bundle size and simplify the codebase
    // Ref: https://github.com/near/near-fastauth-wallet/blob/ac49e3b50a0f180bd9d4df9ebed634d3e1458214/src/ui/IframeDialog.tsx#L3
    const closeButton = this.page.getByRole('img', { name: 'close' });
    await closeButton.click();
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
}

export default SignMultiChain;
