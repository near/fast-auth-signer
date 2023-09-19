/* eslint-disable no-use-before-define */
/* eslint-disable no-unused-vars */
import { KeyPair } from '@near-js/crypto';
import { DelegateAction } from '@near-js/transactions';
import type { ReactElement, ReactNode } from 'react';

export type NetworkId = ProductionNetwork['networkId'];
export type Network = ProductionNetwork;
// export type NetworkId = ProductionNetwork['networkId'] | DevelopmentNetwork['networkId'];
// export type Network = ProductionNetwork | DevelopmentNetwork;

type ProductionNetwork = {
  networkId: 'testnet' | 'mainnet';
  viewAccountId: string;
  nodeUrl: string;
  walletUrl: string;
  helperUrl: string;
  relayerUrl: string;
  explorerUrl: string;
  fastAuth: {
    mpcRecoveryUrl: string;
    newMpcRecoveryUrl?: string;
    authHelperUrl: string; // TODO refactor: review by fastauth team
    accountIdSuffix: string;
    firebase: {
      apiKey: string;
      authDomain: string;
      projectId: string;
      storageBucket: string;
      messagingSenderId: string;
      appId: string;
      measurementId: string;
    };
  };
};

export type UserCredentialsFrpSignature = {
  salt: number;
  oidcToken: string;
  shouldHashToken: boolean;
  keypair: KeyPair;
};

export type SignRequestFrpSignature = {
  salt: number;
  oidcToken: string;
  keypair: KeyPair;
  delegateAction: DelegateAction;
};

export type Device = {
  device: string;
  os: string;
  browser: string;
  publicKeys: string[];
  uid: string;
};

export type DeleteDevice = {
  firebaseId: string;
  publicKeys: string[];
};

// type DevelopmentNetwork = {
//   networkId: 'localnet';
//   viewAccountId: string;
//   nodeUrl: string;
//   walletUrl: string;
//   helperUrl: string;
// };
