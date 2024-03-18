import { BaseTransaction, ChainProvider, NearAuthentication } from '../types';

export type EVMTransaction = BaseTransaction &
  (
    | {
        gasLimit: bigint;
        maxFeePerGas: bigint;
        maxPriorityFeePerGas: bigint;
      }
    | {
        gasLimit?: never;
        maxFeePerGas?: never;
        maxPriorityFeePerGas?: never;
      }
  );

export type EVMChainConfigWithProviders = ChainProvider;

export type EVMRequest = {
  transaction: EVMTransaction;
  chainConfig: EVMChainConfigWithProviders;
  nearAuthentication: NearAuthentication;
  fastAuthRelayerUrl: string;
};
