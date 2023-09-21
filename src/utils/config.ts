import type { Network, NetworkId } from './types';

export const networks: Record<NetworkId, Network> = {
  mainnet: {
    networkId:     'mainnet',
    viewAccountId: 'near',
    nodeUrl:       'https://rpc.mainnet.near.org',
    walletUrl:     'https://wallet.near.org',
    helperUrl:     'https://helper.mainnet.near.org',
    relayerUrl:    process.env.RELAYER_URL || 'https://near-relayer-mainnet.api.pagoda.co/relay',
    explorerUrl:   'https://explorer.near.org',
    fastAuth:      {
      mpcRecoveryUrl:  'https://mpc-recovery-leader-mainnet-cg7nolnlpa-ue.a.run.app',
      authHelperUrl:   'https://api.kitwallet.app',
      accountIdSuffix: 'near',
      firebase:        {
        apiKey:            process.env.FIREBASE_API_KEY || 'AIzaSyDhxTQVeoWdnbpYTocBAABbLULGf6H5khQ',
        authDomain:        process.env.FIREBASE_AUTH_DOMAIN || 'near-fastauth-prod.firebaseapp.com',
        projectId:         process.env.FIREBASE_PROJECT_ID || 'near-fastauth-prod',
        storageBucket:     process.env.FIREBASE_STORAGE_BUCKET || 'near-fastauth-prod.appspot.com',
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '829449955812',
        appId:             process.env.FIREBASE_APP_ID || '1:829449955812:web:532436aa35572be60abff1',
        measurementId:     process.env.FIREBASE_MEASUREMENT_ID || 'G-T2PPJ8QRYY',
      },
    },
  },
  testnet: {
    networkId:     'testnet',
    viewAccountId: 'testnet',
    nodeUrl:       'https://rpc.testnet.near.org',
    walletUrl:     'https://wallet.testnet.near.org',
    helperUrl:     'https://helper.testnet.near.org',
    relayerUrl:    process.env.RELAYER_URL_TESTNET || 'http://34.70.226.83:3030/relay',
    explorerUrl:    'https://explorer.testnet.near.org',
    fastAuth:      {
      mpcRecoveryUrl:  'https://mpc-recovery-leader-testnet-cg7nolnlpa-ue.a.run.app',
      authHelperUrl:   'https://testnet-api.kitwallet.app',
      accountIdSuffix: 'testnet',
      firebase:        {
        apiKey:            process.env.FIREBASE_API_KEY_TESTNET || 'AIzaSyDAh6lSSkEbpRekkGYdDM5jazV6IQnIZFU',
        authDomain:        process.env.FIREBASE_AUTH_DOMAIN_TESTNET || 'pagoda-oboarding-dev.firebaseapp.com',
        projectId:         process.env.FIREBASE_PROJECT_ID_TESTNET || 'pagoda-oboarding-dev',
        storageBucket:     process.env.FIREBASE_STORAGE_BUCKET_TESTNET || 'pagoda-oboarding-dev.appspot.com',
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID_TESTNET || '116526963563',
        appId:             process.env.FIREBASE_APP_ID_TESTNET || '1:116526963563:web:053cb0c425bf514007ca2e',
        measurementId:     process.env.FIREBASE_MEASUREMENT_ID_TESTNET || 'G-HF2NBGE60S',
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

export const networkId: NetworkId = (process.env.NETWORK_ID as NetworkId) || 'mainnet';
export const network = networks[networkId];
export const basePath = process.env.REACT_APP_BASE_PATH || 'fastauth';
