import { Account } from 'near-api-js';

import { Bitcoin } from './chains/Bitcoin';
import EVM from './chains/EVM';

type BaseTransaction = {
  to: string;
  value: string;
};

type EVMTransaction = BaseTransaction & {
  chainId: number;
  gas?: number;
  gasLimit?: number;
};

type BTCTransaction = BaseTransaction &
  (
    | {
        fee?: never;
        utxos?: never;
      }
    | {
        fee: number;
        utxos: any[];
      }
  );

type Interface = {
  transaction: EVMTransaction | BTCTransaction;
  derivedAddress: string;
  // Uncompressed hex format
  derivedPublicKey: string;
  account: Account;
  derivedPath: string
};

const CHAIN_CONFIG = {
  ethereum: {
    providerUrl:
      'https://sepolia.infura.io/v3/6df51ccaa17f4e078325b5050da5a2dd',
    scanUrl: 'https://sepolia.etherscan.io',
    name:    'ETH',
  },
  bsc: {
    providerUrl: 'https://data-seed-prebsc-1-s1.bnbchain.org:8545',
    scanUrl:     'https://testnet.bscscan.com',
    name:        'BNB',
  },
  btc: {
    name:        'BTC',
    networkType: 'testnet' as const,
    // API ref: https://github.com/Blockstream/esplora/blob/master/API.md
    rpcEndpoint: 'https://blockstream.info/testnet/api/',
    scanUrl:     'https://blockstream.info/testnet',
  },
};

const MPC_ROOT_PUBLIC_KEY =  'secp256k1:4HFcTSodRLVCGNVcGc4Mf2fwBBBxv9jxkGdiW2S2CA1y6UpVVRWKj6RX7d7TDt65k2Bj3w9FU4BGtt43ZvuhCnNt';

const signAndSend = async (data: Interface) => {
  let txid: string;
  if ('chainId' in data.transaction) {
    let evm: EVM;

    if (data.transaction.chainId === 11155111) {
      evm = new EVM({ ...CHAIN_CONFIG.ethereum, relayerUrl: 'http://34.136.82.88:3030' });
    } else if (data.transaction.chainId === 97) {
      evm = new EVM({ ...CHAIN_CONFIG.bsc, relayerUrl: 'http://34.136.82.88:3030' });
    }

    txid = (await evm.handleTransaction(data.transaction, data.account, data.derivedPath, MPC_ROOT_PUBLIC_KEY)).hash;
  } else {
    const btc = new Bitcoin({ ...CHAIN_CONFIG.btc, relayerUrl: 'http://34.136.82.88:3030' });

    txid = await btc.handleTransaction(
      { ...data.transaction, value: parseInt(data.transaction.value, 10) },
      data.account,
      data.derivedPath,
      MPC_ROOT_PUBLIC_KEY
    );
  }

  console.log({ txid });
};

export const getDerivedAddress =   async (signerId: string, path: string, chain: string) => {
  let derivedAddress: string;

  if (['BNB', 'ETH'].includes(chain)) {
    derivedAddress =  await EVM.deriveProductionAddress(signerId, path, MPC_ROOT_PUBLIC_KEY);
  } else {
    derivedAddress =  (await Bitcoin.deriveProductionAddress(signerId, path, MPC_ROOT_PUBLIC_KEY)).address;
  }

  console.log({ derivedAddress });
};

export default signAndSend;
