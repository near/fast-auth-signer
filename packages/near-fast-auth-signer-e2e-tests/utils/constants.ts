import { Page } from 'playwright/test';

export const getFastAuthIframe = (page: Page) => page.frameLocator('#nfw-connect-iframe');

export const TIMEOUT = 30000;

// Below are the static derived addresses
export const ETH_PERSONAL_KEY_ADDRESS = '0xf64750f13f75fb9e2f4d9fd98ab72d742d1e33eb';
export const BNB_DOMAIN_KEY_ADDRESS =  '0x81d205120a9f04d3f1ce733c5ed0a0bc66714c71';

// BNB_PERSONAL_KEY_ADDRESS => '0xf64750f13f75fb9e2f4d9fd98ab72d742d1e33eb';
// ETH_UNKNOWN_KEY_ADDRESS => '0xf64750f13f75fb9e2f4d9fd98ab72d742d1e33eb';
// BNB_UNKNOWN_KEY_ADDRESS => '0xf64750f13f75fb9e2f4d9fd98ab72d742d1e33eb';
// ETH_DOMAIN_KEY_ADDRESS =>  '0x81d205120a9f04d3f1ce733c5ed0a0bc66714c71';

export const receivingAddresses = {
  ETH_BNB: '0x7F780C57D846501De4824046EF4c503Ce1c8eAF9',
  BTC:     'msMLG6MyKQQnLKwnTuMAsWMTCvCm1NTrgM'
};
