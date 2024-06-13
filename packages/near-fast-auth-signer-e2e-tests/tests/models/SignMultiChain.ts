/* eslint-disable class-methods-use-this */

import { Page } from '@playwright/test';

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
    // Wait for the iframe to finish loading

    /*    await this.page.waitForSelector(`input#${keyType}`, { state: 'visible' });
    await this.page.waitForSelector(`input#${assetType.toLowerCase()}`, { state: 'visible' });
    await this.page.waitForSelector('input#amount', { state: 'visible' });
    await this.page.waitForSelector('input#address', { state: 'visible' });
    await this.page.waitForSelector('button[type="submit"]', { state: 'visible' }); */

    await this.page.check(`input#${keyType}`);
    await this.page.check(`input#${assetType.toLowerCase()}`);
    await this.page.fill('input#amount', `${amount}`);
    await this.page.fill('input#address', `${address}`);
    await this.page.click('button[type="submit"]');
    await this.disablePointerEventsInterruption();
  }

  async clickApproveButton() {
    // Ensure the button inside the iframe is visible and interactable
    const frame = getFastAuthIframe(this.page);
    const approveButton = frame.locator('button:has-text("Approve")');
    await approveButton.waitFor({ state: 'visible' });
    await approveButton.click({ force: true });
  }

  async submitAndApproveTransaction({
    keyType, assetType, amount, address
  }: TransactionDetail) {
    await this.submitTransactionInfo({
      keyType, assetType, amount, address
    });
    await this.clickApproveButton();
  }

  // Disable pointer events on overlay elements within the iframe and page
  async disablePointerEventsInterruption() {
    // Hide webpack overlay
    await this.page.evaluate(() => {
      const overlay = document.getElementById('webpack-dev-server-client-overlay');
      if (overlay) overlay.style.display = 'none';
    });

    this.page.on('frameattached', async (frame) => {
      const frameElement = await frame.frameElement();
      const frameId = await frameElement.getAttribute('id');
      if (frameId === 'nfw-connect-iframe') {
        await this.page.evaluate(() => {
          document.querySelectorAll('.ant-modal-wrap, .ant-modal-root, .ant-modal-mask')
            // eslint-disable-next-line no-return-assign
            .forEach((element) => (element as HTMLElement).style.pointerEvents = 'none');
        });
      }
    });
  }
}

export default SignMultiChain;
