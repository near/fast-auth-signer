import { KeyPair } from '@near-js/crypto';

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

export type EVMChainConfigWithProviders = ChainProviders;
export type BTCChainConfigWithProviders = ChainProviders & {
  networkType: "bitcoin" | "testnet";
};

export type Request = {
  transaction: EVMTransaction | BTCTransaction;
  chainConfig: EVMChainConfigWithProviders | BTCChainConfigWithProviders;
  nearAuthentication: {
    networkId: "testnet" | "mainnet";
    keypair: KeyPair;
    accountId: string;
  };
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
