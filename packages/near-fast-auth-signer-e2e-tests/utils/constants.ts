import { Page } from 'playwright/test';

export const getFastAuthIframe = (page: Page) => page.frameLocator('#nfw-connect-iframe');

export const TIMEOUT = 30000;

export const receivingAddresses = {
  ETH_BNB: '0x7F780C57D846501De4824046EF4c503Ce1c8eAF9',
  BTC:     'msMLG6MyKQQnLKwnTuMAsWMTCvCm1NTrgM'
};
