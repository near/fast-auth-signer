/* eslint-disable no-use-before-define */
/* eslint-disable no-unused-vars */
import { KeyPair, PublicKey } from '@near-js/crypto';
import { DelegateAction } from '@near-js/transactions';

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
  sentryDsn?: string;
  fastAuth: {
    mpcRecoveryUrl: string;
    authHelperUrl: string;
    queryApiUrl?: string;
    accountIdSuffix: string;
    mpcPublicKey: PublicKey,
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
  gateway: string | null;
  dateTime: Date;
  keyType: string;
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
