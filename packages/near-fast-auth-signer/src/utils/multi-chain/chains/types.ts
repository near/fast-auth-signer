import { Account } from '@near-js/accounts';
import { ChainSignatureContracts } from '../signature';

export type UTXO = {
  txid: string;
  vout: number;
  value: number
}

type BaseTransaction = {
  to: string;
  value: string;
  derivedPath: string
};

export type EVMTransaction = BaseTransaction & ({
  gasLimit: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
} | {
  gasLimit?: never;
  maxFeePerGas?: never;
  maxPriorityFeePerGas?: never;
});

type BtcInputsAndOutputs = {
  inputs: UTXO[];
  outputs: { address: string, value: number }[];
};

export type BTCTransaction = BaseTransaction & (BtcInputsAndOutputs | {
  inputs?: never;
  outputs?: never;
});

type ChainProviders = {
  providerUrl: string,
  contract: ChainSignatureContracts
}

type EVMChainConfig = {
  type: 'EVM',
}

type BTCChainConfig = {
  type: 'BTC'
  networkType: 'bitcoin' | 'testnet'
}

export type ChainConfig = EVMChainConfig | BTCChainConfig

export type EVMChainConfigWithProviders = ChainProviders & EVMChainConfig
export type BTCChainConfigWithProviders = ChainProviders & BTCChainConfig

export type Request = {
  transaction: EVMTransaction | BTCTransaction;
  chainConfig: EVMChainConfigWithProviders | BTCChainConfigWithProviders;
  account: Account;
  fastAuthRelayerUrl: string;
};

type SuccessResponse = {
  transactionHash: string;
  success: true;
}

type FailureResponse = {
  success: false;
  errorMessage: string;
}

export type Response = SuccessResponse | FailureResponse
