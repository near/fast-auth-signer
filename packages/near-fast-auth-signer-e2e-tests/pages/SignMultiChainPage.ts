/* eslint-disable class-methods-use-this */

import { expect, Page, Frame } from '@playwright/test';

import { TESTNET_ADDRESS } from '../utils/multiChain';

const TIMEOUT = 1000000;

type KeyType = 'domainKey' | 'personalKey' | 'wrongKey';
type AssetType = 'eth' | 'bnb' | 'btc';

const uiLabelsAssetMap = {
  eth: {
    symbol:  'ETH',
    network: 'Ethereum Sepolia Network'
  },
  btc: {
    symbol:  'BTC',
    network: 'Bitcoin Network'
  },
  bnb: {
    symbol:  'BNB',
    network: 'Binace Smart Chain Testnet'
  },
};

class SignMultiChainPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Simulate transaction
  async simulateTransaction(keyType: KeyType, assetType: AssetType, amount: number) {
    await this.selectKeyType(keyType);
    await this.selectAssetType(assetType);
    await this.fillAmount(amount);
    await this.submitTransaction();
    await this.assertTransactionDetails(keyType, assetType, amount);
  }

  async waitForIframeContents() {
    const iframeElement = await this.page.locator('#nfw-connect-iframe').elementHandle();
    const frame = await iframeElement.contentFrame();
    if (!frame) {
      throw new Error('Iframe is not available.');
    }
    await frame.waitForURL(/.*\/sign-multichain\//i, { waitUntil: 'networkidle', timeout: TIMEOUT });
    return frame;
  }

  async selectKeyType(keyType: KeyType) {
    await this.page.locator(`input[name="keyType"][value="${keyType}"]`).click();
  }

  async selectAssetType(assetType: AssetType) {
    const assetTypeLowerCase = assetType.toLowerCase();
    await this.page.locator(`input[name="assetType"][id="${assetTypeLowerCase}"]`).click();
  }

  async fillAmount(amount: number) {
    await this.page.locator('input[name="amount"]').fill(`${amount}`);
  }

  async submitTransaction() {
    await this.page.getByRole('button', { name: 'Submit' }).click();
  }

  async assertTransactionDetails(keyType: KeyType, assetType: AssetType, amount: number) {
    const frame = await this.waitForIframeContents();
    if (keyType === 'domainKey') return;

    const { symbol, network } = uiLabelsAssetMap[assetType.toLowerCase()];

    await frame.locator(`text=Send ${amount} ${symbol}`).waitFor({ state: 'visible' });
    await frame.getByTitle(TESTNET_ADDRESS).waitFor({ state: 'visible' });
    await frame.locator(`text=${network}`).waitFor({ state: 'visible' });
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

  async expectApprovalButtonDisabled(frame: Frame) {
    await expect(frame.locator('button:has-text("Approve")')).toBeDisabled();
    await frame.locator('input[type="checkbox"]').check();
    await expect(frame.locator('button:has-text("Approve")')).toBeEnabled();
  }

  async handleWrongKeyTransaction(frame: Frame) {
    await this.waitForTransactionDetails(frame);
    await this.expectWarningMessage(frame);
    await this.expectApprovalButtonDisabled(frame);
  }
}

export default SignMultiChainPage;
