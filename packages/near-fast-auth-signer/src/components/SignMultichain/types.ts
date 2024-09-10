import {
  EVMRequest, BitcoinRequest, BTCNetworkIds, KeyDerivationPath
} from 'multichain-tools';

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
// This type should be kept in sync with near-fastauth-wallet receiving message: https://github.com/near/near-fastauth-wallet/blob/bc01be297c3fc140e330f8ec7a6e05382807dc51/src/lib/fastAuthWalletConnection.ts#L81
export type SendMultichainMessage =
  | (Omit<
      EVMRequest,
      'nearAuthentication' | 'chainConfig' | 'derivationPath'
    > & {
      chainConfig?: Partial<EVMRequest['chainConfig']>;
      derivationPath: Omit<KeyDerivationPath, 'chain'> & { chain: 60 };
    })
  | (Omit<
      BitcoinRequest,
      'nearAuthentication' | 'chainConfig' | 'derivationPath'
    > & {
      chainConfig: {
        network: BTCNetworkIds;
      } & Partial<Omit<BitcoinRequest['chainConfig'], 'network'>>;
      derivationPath: Omit<KeyDerivationPath, 'chain'> & { chain: 0 };
    });
