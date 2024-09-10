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
  EVM_PERSONAL:   '0xcd624654b0503c75e2b0d47a2e4f01624273e0a7',
  EVM_PERSONAL_2: '0x24a4281423f0b9a808e6a14f07ca291650207119',
  EVM_PERSONAL_3: '0xe0de18b6dea2dc4ee206ab182aed77639fc0f93b',
  EVM_UNKNOWN:    '0x410e07f96e3952ad41de47ea648a724f540fbfe5',
  EVM_DOMAIN:     '0x5f1ae590ade2543b0423e900f1323c62689b1c42',
};
