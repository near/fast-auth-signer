import { EVMRequest, BitcoinRequest, BTCNetworkIds } from 'multichain-tools';
import { KeyDerivationPath } from 'multichain-tools/src/kdf/types';

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
