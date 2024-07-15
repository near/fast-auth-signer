import { Page } from 'playwright/test';

export const getFastAuthIframe = (page: Page) => page.frameLocator('#nfw-connect-iframe');

export const TIMEOUT = 30000;

export const receivingAddresses = {
  ETH_BNB:                        '0x7F780C57D846501De4824046EF4c503Ce1c8eAF9',
  BTC:                            'msMLG6MyKQQnLKwnTuMAsWMTCvCm1NTrgM',
  ETH_SET_SMART_CONTRACT:             '0x2fa5f72e70771ec5b238b4E4EAFfd6F21bF6adf5',
  ETH_FT_SMART_CONTRACT:          '0xF3F795f8Bde4421ff3e8D18964a39B64fA685690',
  ETH_NFT_ERC721_SMART_CONTRACT:  '0x3D72C76702EFBC59e656b4dc91794FbBDb50457d',
  ETH_NFT_ERC1155_SMART_CONTRACT: '0x392633e8fBA6B35995cD78514DC51A85116644FF'
};

// Derived addresses considering the accountId as johndoe12.testnet
export const senderAddresses = {
  EVM_PERSONAL: '0xf64750f13f75fb9e2f4d9fd98ab72d742d1e33eb',
  EVM_DOMAIN:   '0x81d205120a9f04d3f1ce733c5ed0a0bc66714c71',
  EVM_UNKNOWN:  '0x31feb62afbe48a8953842c4636ce33e3afbba2ec',
  BTC_PERSONAL: 'mjHqhp21dBz2JHagTLpW7Eiu4KD1VhfuEy',
  BTC_DOMAIN:   'mftoZ8Qcf47mYGWvEzE8os97BcrSQNAHBn',
  BTC_UNKNOWN:  'mks5SRmVmvxEqWzjaRz5YqtnZ5bqyv9ESw',
};
