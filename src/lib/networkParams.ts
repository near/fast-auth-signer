export default {
  mainnet: {
    networkId: 'mainnet',
    nodeUrl:   'https://rpc.mainnet.near.org',
    walletUrl: 'https://wallet.near.org',
    helperUrl: 'https://helper.mainnet.near.org',
  },
  testnet: {
    networkId: 'testnet',
    nodeUrl:   'https://rpc.testnet.near.org',
    walletUrl: 'https://wallet.testnet.near.org',
    helperUrl: 'https://helper.testnet.near.org',
  },
  localnet: {
    // these are defined by https://github.com/kurtosis-tech/near-package
    networkId: 'localnet',
    nodeUrl:   'http://127.0.0.1:8332',
    walletUrl: 'http://127.0.0.1:8334',
    helperUrl: 'http://127.0.0.1:8330',
  },
};
