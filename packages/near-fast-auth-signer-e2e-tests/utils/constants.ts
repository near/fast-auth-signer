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
export const derivedAddresses = {
  EVM_PERSONAL:   '0x65a2e1dfe3b157c3d491f32d6c2c44e4d3a69dd9',
  EVM_PERSONAL_2: '0x80a5dd65208c29bb0b5b99eedf53ae489d597ec2',
  EVM_PERSONAL_3: '0x91d036588cb42f5bcd6227ebdbd4d09063d673e5',
  EVM_UNKNOWN:    '0x7159c9bda696bf1213933ad3851db30f335a1d0b',
  EVM_DOMAIN:     '0xa02fa1b0fcf4bf1f380a2bdaaf4cddedb84571e5',
};
