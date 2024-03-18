import { BaseTransaction, ChainProvider, NearAuthentication } from '../types';

export type UTXO = {
  txid: string;
  vout: number;
  value: number;
  script: string;
};

type BtcInputsAndOutputs = {
  inputs: UTXO[];
  outputs: { address: string; value: number }[];
};

export type BTCTransaction = BaseTransaction &
  (
    | BtcInputsAndOutputs
    | {
        inputs?: never;
        outputs?: never;
      }
  );

export type BTCChainConfigWithProviders = ChainProvider & {
  networkType: 'bitcoin' | 'testnet';
};

export type BitcoinRequest = {
  transaction: BTCTransaction;
  chainConfig: BTCChainConfigWithProviders;
  nearAuthentication: NearAuthentication;
  fastAuthRelayerUrl: string;
};

export type BTCNetworks = 'mainnet' | 'testnet';
