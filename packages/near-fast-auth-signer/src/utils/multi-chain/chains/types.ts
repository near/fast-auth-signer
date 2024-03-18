import { KeyPair } from '@near-js/crypto';

export type ChainSignatureContracts = 'multichain-testnet-2.testnet'

export type BaseTransaction = {
  to: string;
  value: string;
  derivedPath: string
};

export type ChainProvider = {
  providerUrl: string,
  contract: ChainSignatureContracts
}

export type NearAuthentication = {
  networkId: 'testnet' | 'mainnet';
  keypair: KeyPair;
  accountId: string;
}

type SuccessResponse = {
  transactionHash: string;
  success: true;
}

type FailureResponse = {
  success: false;
  errorMessage: string;
}

export type Response = SuccessResponse | FailureResponse

export type NearNetworkIds = 'mainnet' | 'testnet';
