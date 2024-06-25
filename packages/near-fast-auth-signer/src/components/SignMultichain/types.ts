import { EVMRequest, BitcoinRequest } from 'multichain-tools';

export type EVMChain = 'ETH' | 'BNB';
export type Chain = EVMChain | 'BTC';

export type EVMChainMap<T = any> = {
  // Disabling because the key needs to be defined but not used
  // eslint-disable-next-line no-unused-vars
  [key in EVMChain]: T
};

export type ChainMap<T = any> = {
  // Disabling because the key needs to be defined but not used
  // eslint-disable-next-line no-unused-vars
  [key in Chain]: T
};

export type SendMultichainMessage = Omit<EVMRequest | BitcoinRequest, 'nearAuthentication'>;
