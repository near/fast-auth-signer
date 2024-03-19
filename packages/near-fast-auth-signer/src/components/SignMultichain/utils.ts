import { formatEther, formatUnits } from 'ethers';

import { bitcoinSchema } from './bitcoin/schema';
import { evmSchema } from './evm/schema';
import {
  Chain,
  ChainMap,
  EVMChainMap,
  MultichainInterface
} from './types';
import { assertNever } from '../../utils';
import { networkId } from '../../utils/config';
import {
  fetchBTCFeeProperties,
  fetchEVMFeeProperties,
  signAndSendBTCTransaction,
  signAndSendEVMTransaction,
} from '../../utils/multi-chain/multiChain';
import { fetchGeckoPrices } from '../Sign/Values/fiatValueManager';

// TODO: use this for blacklisting on limited access key creation AND sign
const MULTICHAIN_CONTRACT_TESTNET = 'multichain-testnet-2.testnet';
const MULTICHAIN_CONTRACT_MAINNET = 'multichain-testnet-2.testnet';

function toBTC(satoshis: number): number {
  return satoshis / 100000000;
}

type BTCFeeProperites = {
  inputs: {
      txid: string;
      vout: number;
      value: number;
      script: string;
  }[];
  outputs: {
      address: string;
      value: number;
  }[];
  fee: number;
};

type EVMFeeProperties = {
  gasLimit: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  maxFee: bigint;
}

export type TransactionFeeProperties = BTCFeeProperites | EVMFeeProperties

const EVMChains: EVMChainMap<boolean> = {
  ETH: true,
  BNB: true,
};
const isEVMChain = (chain: Chain): boolean => !!EVMChains[chain];

const FAST_AUTH_RELAYER_URL = 'http://34.136.82.88:3030';

const CHAIN_CONFIG: ChainMap = {
  ETH: {
    providerUrl: 'https://sepolia.infura.io/v3/6df51ccaa17f4e078325b5050da5a2dd',
  },
  BNB: {
    providerUrl: 'https://data-seed-prebsc-1-s1.bnbchain.org:8545',
  },
  BTC: {
    networkType: 'testnet',
    // API ref: https://github.com/Blockstream/esplora/blob/master/API.md
    providerUrl: 'https://blockstream.info/testnet/api/',
  },
};

export const getMultiChainContract = () => (process.env.NETWORK_ID === 'mainnet' ? MULTICHAIN_CONTRACT_MAINNET : MULTICHAIN_CONTRACT_TESTNET);

const getSchema = (asset: Chain) => {
  switch (asset) {
    case 'BTC':
      return bitcoinSchema;
    case 'ETH':
    case 'BNB':
      return evmSchema;
    default:
      return assertNever(asset);
  }
};

export const validateMessage = async (message: MultichainInterface, asset: Chain): Promise<boolean
| Error> => {
  const schema = getSchema(asset);
  if (!schema) {
    return new Error(`Schema for asset ${asset} is not defined`);
  }

  try {
    await schema.validate(message);
    return true;
  } catch (e) {
    return new Error(e);
  }
};

export const multichainAssetToCoinGeckoId = (asset: Chain) => {
  const map: ChainMap = {
    ETH:  'ethereum',
    BNB:  'binancecoin',
    BTC:  'bitcoin',
  };

  return map[asset] || null;
};

export const multichainAssetToNetworkName = (asset: Chain) => {
  // the names below should indicate chainId / network type (e.g testnet, mainnet, sepolia etc.)
  const map: ChainMap = {
    ETH:  'Ethereum Network',
    BNB:  'Binance Smart Chain',
    BTC:  'Bitcoin Network',
  };

  return map[asset] || null;
};

export async function getMultichainCoinGeckoPrice(asset: Chain) {
  return fetchGeckoPrices(multichainAssetToCoinGeckoId(asset));
}

const convertTokenToReadable = (value : MultichainInterface['value'], asset: Chain) => {
  if (isEVMChain(asset)) {
    return parseFloat(formatEther(value));
  }
  if (asset === 'BTC') {
    return toBTC(Number(value));
  }
  return Number(value);
};

export const getTokenAndTotalPrice = async (asset: Chain, value: MultichainInterface['value']) => {
  const id = multichainAssetToCoinGeckoId(asset);
  if (id) {
    const res = await getMultichainCoinGeckoPrice(asset);
    if (!res) {
      return {
        price:       0,
        tokenAmount: convertTokenToReadable(value, asset)
      };
    }
    const tokenPrice: number = res[id].usd;
    const tokenAmount = convertTokenToReadable(value, asset);
    return {
      price: parseInt((tokenPrice * tokenAmount * 100).toString(), 10) / 100,
      tokenAmount,
      tokenPrice
    };
  }
  return {
    price:       0,
    tokenAmount: convertTokenToReadable(value, asset)
  };
};

export const shortenAddress = (address: string): string => {
  if (address.length < 10) {
    return address;
  }
  return `${address.substring(0, 7)}...${address.substring(address.length - 5)}`;
};

export const multichainSignAndSend = async ({
  domain,
  asset,
  to,
  value,
  feeProperties
}: {
  domain: string;
  asset: Chain;
  to: string;
  value: string;
  feeProperties: TransactionFeeProperties;
}) => {
  // TODO: remove duplicate fee fetching
  const accountId = window.fastAuthController.getAccountId();
  const keypair = await window.fastAuthController.getKey(accountId);
  const derivedPath = `,${multichainAssetToCoinGeckoId(asset)},${domain}`;
  const chainConfig = {
    contract:    MULTICHAIN_CONTRACT_TESTNET,
    ...CHAIN_CONFIG[asset],
  };

  if (isEVMChain(asset)) {
    return signAndSendEVMTransaction({
      transaction: {
        to,
        value,
        derivedPath,
        gasLimit:             (feeProperties as EVMFeeProperties).gasLimit,
        maxFeePerGas:         (feeProperties as EVMFeeProperties).maxFeePerGas,
        maxPriorityFeePerGas: (feeProperties as EVMFeeProperties).maxPriorityFeePerGas,
      },
      nearAuthentication: { networkId, keypair, accountId },
      fastAuthRelayerUrl: FAST_AUTH_RELAYER_URL,
      chainConfig
    });
  }

  return signAndSendBTCTransaction({
    transaction: {
      to,
      value,
      derivedPath,
      inputs:  (feeProperties as BTCFeeProperites).inputs,
      outputs: (feeProperties as BTCFeeProperites).outputs,
    },
    nearAuthentication: { networkId, keypair, accountId },
    fastAuthRelayerUrl: FAST_AUTH_RELAYER_URL,
    chainConfig
  });
};

export const multichainGetFeeProperties = async ({
  asset,
  to,
  value,
  from = null,
}: {
  asset: Chain;
  to: string;
  value: string;
  from?: string;
}) => {
  if (asset === 'BTC') {
    const feeProperties =  (await fetchBTCFeeProperties(CHAIN_CONFIG.BTC.providerUrl, from, [{
      address: to,
      value:   Number(value)
    }]));

    return { ...feeProperties, feeDisplay: toBTC(feeProperties.fee) };
  } if (isEVMChain(asset)) {
    const feeProperties = await fetchEVMFeeProperties(CHAIN_CONFIG.ETH.providerUrl, {
      to,
      value
    });
    return { ...feeProperties, feeDisplay: formatUnits(feeProperties.maxFee) };
  }
  return null;
};
