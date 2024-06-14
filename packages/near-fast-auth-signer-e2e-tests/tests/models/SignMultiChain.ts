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
    keyType, assetType, amount, address
  }: TransactionDetail) {
    await this.page.check(`input#${keyType}`);
    await this.page.check(`input#${assetType.toLowerCase()}`);
    await this.page.fill('input#amount', `${amount}`);
    await this.page.fill('input#address', `${address}`);
    await this.page.click('button[type="submit"]');
  }

  async clickApproveButton() {
    const frame = getFastAuthIframe(this.page);
    const approveButton = frame.locator('button:has-text("Approve")');
    await approveButton.waitFor({ state: 'visible' });
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

    // Hide blocking overlays from ant-modal
    this.page.on('frameattached', async (frame) => {
      const frameElement = await frame.frameElement();
      const frameId = await frameElement.getAttribute('id');
      if (frameId === 'nfw-connect-iframe') {
        await this.page.evaluate(() => {
          document.querySelectorAll('.ant-modal-wrap, .ant-modal-root, .ant-modal-mask')
            .forEach((element) => {
              const htmlElement = element as HTMLElement;
              htmlElement.style.pointerEvents = 'none';
              htmlElement.style.zIndex = '-1';
            });
        });
      }
    });
  }
}

export default SignMultiChain;
