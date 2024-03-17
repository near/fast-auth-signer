import { Account } from '@near-js/accounts';
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
import { Bitcoin } from '../../utils/multi-chain/chains/Bitcoin';
import signAndSend, { getEstimatedFeeBTC, getEstimatedFeeEVM } from '../../utils/multi-chain/multiChain';
import { fetchGeckoPrices } from '../Sign/Values/fiatValueManager';

// TODO: use this for blacklisting on limited access key creation AND sign
const MULTICHAIN_CONTRACT_TESTNET = 'multichain-testnet-2.testnet';
const MULTICHAIN_CONTRACT_MAINNET = 'multichain-testnet-2.testnet';

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
    return Bitcoin.toBTC(Number(value));
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
}: {
  domain: string;
  asset: Chain;
  to: string;
  value: string;
}) => {
  const type = isEVMChain(asset) ? 'EVM' : 'BTC';
  const accountId = window.fastAuthController.getAccountId();
  const derivedPath = `,${multichainAssetToCoinGeckoId(asset)},${domain}`;
  const account = new Account(
    window.fastAuthController.getConnection(),
    accountId
  );
  const chainConfig = {
    contract: MULTICHAIN_CONTRACT_TESTNET,
    type,
    ...CHAIN_CONFIG[asset],
  };

  return signAndSend({
    transaction: {
      to,
      value,
      derivedPath
    },
    account,
    fastAuthRelayerUrl: FAST_AUTH_RELAYER_URL,
    chainConfig
  });
};

export const multichainGetTotalGas = async ({
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
    const satoshis =  await getEstimatedFeeBTC(
      {
        from,
        targets: [{
          address: to,
          value:   Number(value)
        }]
      },
      {
        type:        'BTC',
        networkType: 'testnet',
        contract:    MULTICHAIN_CONTRACT_TESTNET,
        ...CHAIN_CONFIG.BTC,
      },
      FAST_AUTH_RELAYER_URL,
    );
    return Bitcoin.toBTC(satoshis);
  } if (isEVMChain(asset)) {
    const wei = await getEstimatedFeeEVM({
      to,
      value
    }, {
      type:     'EVM',
      contract:    MULTICHAIN_CONTRACT_TESTNET,
      ...CHAIN_CONFIG[asset],
    }, FAST_AUTH_RELAYER_URL);
    return formatUnits(wei);
  }
  return null;
};
