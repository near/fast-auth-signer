import type { Network, NetworkId } from './types';

export const networks: Record<NetworkId, Network> = {
  mainnet: {
    networkId:     'mainnet',
    viewAccountId: 'near',
    nodeUrl:       'https://rpc.mainnet.near.org',
    walletUrl:     'https://wallet.near.org',
    helperUrl:     'https://helper.mainnet.near.org',
    relayerUrl:    process.env.RELAYER_URL,
    explorerUrl:   'https://explorer.near.org',
    fastAuth:      {
      mpcRecoveryUrl:  'https://mpc-recovery-leader-mainnet-cg7nolnlpa-ue.a.run.app',
      authHelperUrl:   'https://api.kitwallet.app',
      accountIdSuffix: 'near',
      firebase:        {
        apiKey:            process.env.FIREBASE_API_KEY,
        authDomain:        process.env.FIREBASE_AUTH_DOMAIN,
        projectId:         process.env.FIREBASE_PROJECT_ID,
        storageBucket:     process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId:             process.env.FIREBASE_APP_ID,
        measurementId:     process.env.FIREBASE_MEASUREMENT_ID,
      },
    },
  },
  testnet: {
    networkId:     'testnet',
    viewAccountId: 'testnet',
    nodeUrl:       'https://rpc.testnet.near.org',
    walletUrl:     'https://wallet.testnet.near.org',
    helperUrl:     'https://helper.testnet.near.org',
    relayerUrl:    process.env.RELAYER_URL_TESTNET,
    explorerUrl:    'https://explorer.testnet.near.org',
    fastAuth:      {
      mpcRecoveryUrl:  'https://mpc-recovery-leader-testnet-cg7nolnlpa-ue.a.run.app',
      authHelperUrl:   'https://testnet-api.kitwallet.app',
      accountIdSuffix: 'testnet',
      firebase:        {
        apiKey:            process.env.FIREBASE_API_KEY_TESTNET,
        authDomain:        process.env.FIREBASE_AUTH_DOMAIN_TESTNET,
        projectId:         process.env.FIREBASE_PROJECT_ID_TESTNET,
        storageBucket:     process.env.FIREBASE_STORAGE_BUCKET_TESTNET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID_TESTNET,
        appId:             process.env.FIREBASE_APP_ID_TESTNET,
        measurementId:     process.env.FIREBASE_MEASUREMENT_ID_TESTNET,
      },
    },
  },
  // localnet: {
  //   // these are defined by https://github.com/kurtosis-tech/near-package
  //   networkId: 'localnet',
  //   viewAccountId: 'test.near',
  //   nodeUrl: 'http://127.0.0.1:8332',
  //   walletUrl: 'http://127.0.0.1:8334',
  //   helperUrl: 'http://127.0.0.1:8330',
  // },
};

export const networkId: NetworkId = (process.env.NETWORK_ID as NetworkId);
export const network = networks[networkId];
export const basePath = process.env.REACT_APP_BASE_PATH;
