import * as bitcoin from 'bitcoinjs-lib';
import canonicalize from 'canonicalize';
import { formatEther, formatUnits } from 'ethers';
import pickBy from 'lodash.pickby';
import * as yup from 'yup';

import { SendBTCMultichainMessageSchema } from './bitcoin/schema';
import { SendEVMMultichainMessageSchema } from './evm/schema';
import {
  BTCSendMultichainMessage,
  Chain,
  ChainMap,
  EVMChainMap,
  EvmSendMultichainMessage,
  SendMultichainMessage,
} from './types';
import { networkId } from '../../utils/config';
import {
  fetchBTCFeeProperties,
  fetchDerivedBTCAddress,
  fetchDerivedEVMAddress,
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

type BTCFeeProperties = {
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

export type TransactionFeeProperties = BTCFeeProperties | EVMFeeProperties

const EVMChains: EVMChainMap<boolean> = {
  ETH: true,
  BNB: true,
};
export const isTokenSymbolEVMChain = (chain: Chain): boolean => !!EVMChains[chain];

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

const SendMultichainMessageSchema = yup.lazy((value) => {
  // chain is the slip044 chain id
  if (value.chain === 60) {
    return SendEVMMultichainMessageSchema;
  } if (value.chain === 0) {
    return SendBTCMultichainMessageSchema;
  }
  throw new Error(`Schema for chain ${value.chain} is not defined`);
});

export const validateMessage = async (message: SendMultichainMessage): Promise<boolean
| Error> => {
  try {
    await SendMultichainMessageSchema.validate(message);
    return true;
  } catch (err) {
    return err;
  }
};

type ChainDetails = { chain: number; chainId?: bigint };

export const getTokenSymbol = (chainDetails: ChainDetails) => {
  // chain is the slip044 chain id
  if (chainDetails.chain === 60) {
    return {
      1:        'ETH',
      56:       'BNB',
      97:       'BNB',
      11155111: 'ETH'
    }[Number(chainDetails.chainId)];
  }
  return {
    0: 'BTC',
  }[chainDetails.chain];
};

export const multichainAssetToCoinGeckoId = (chainDetails: ChainDetails) => {
  const chainIdMap = {
    1:        'ethereum',
    56:       'binancecoin',
    97:       'binancecoin',
    11155111: 'ethereum'
  };

  const evmChainId = Number(chainDetails.chainId);

  // chain is the slip044 chain id
  if (chainDetails.chain === 60) {
    return chainIdMap[evmChainId];
  }

  return {
    0: 'bitcoin',
  }[chainDetails.chain];
};

export const multichainAssetToNetworkName = (chainDetails: ChainDetails) => {
  // chain is the slip044 chain id
  if (chainDetails.chain === 60) {
    return {
      1:        'Ethereum Mainnet',
      56:       'Binance Smart Chain Mainnet',
      97:       'Binace Smart Chain Testnet',
      11155111: 'Ethereum Sepolia Network'
    }[Number(chainDetails.chainId)];
  }

  return {
    0: 'Bitcoin Network',
  }[chainDetails.chain];
};

export async function getMultichainCoinGeckoPrice(chainDetails: ChainDetails) {
  return fetchGeckoPrices(multichainAssetToCoinGeckoId(chainDetails));
}

const convertTokenToReadable = (value : SendMultichainMessage['value'], chain: number) => {
  // chain is the slip044 chain id
  if (chain === 60) {
    return parseFloat(formatEther(value));
  }
  if (chain === 0) {
    return toBTC(Number(value));
  }
  return Number(value);
};

export const getTokenAndTotalPrice = async (message: SendMultichainMessage) => {
  const chainDetails = {
    chain:   message.chain,
    chainId: (message as EvmSendMultichainMessage)?.chainId,
  };
  const id = multichainAssetToCoinGeckoId(chainDetails);
  const tokenAmount = convertTokenToReadable(message.value, chainDetails.chain);

  if (id) {
    const res = await getMultichainCoinGeckoPrice(chainDetails);
    if (!res) {
      return {
        price:       0,
        tokenAmount
      };
    }
    const tokenPrice: number = res[id].usd;
    return {
      price: parseInt((tokenPrice * tokenAmount * 100).toString(), 10) / 100,
      tokenAmount,
      tokenPrice
    };
  }
  return {
    price:       0,
    tokenAmount
  };
};

export const shortenAddress = (address: string): string => {
  if (address.length < 10) {
    return address;
  }
  return `${address.substring(0, 7)}...${address.substring(address.length - 5)}`;
};

export const multichainSignAndSend = async ({
  signMultichainRequest,
  feeProperties
}: {
  signMultichainRequest: EvmSendMultichainMessage | BTCSendMultichainMessage;
  feeProperties: TransactionFeeProperties;
}) => {
  const accountId = window.fastAuthController.getAccountId();
  const keypair = await window.fastAuthController.getKey(accountId);
  const chainDetails = {
    chain:   signMultichainRequest.chain,
    chainId: (signMultichainRequest as EvmSendMultichainMessage).chainId,
  };
  const derivedPath = canonicalize(pickBy({
    chain:  signMultichainRequest.chain,
    domain: signMultichainRequest.domain,
    meta:   signMultichainRequest.meta,
  }, (v) => v !== undefined && v !== null));

  const chainConfig = {
    contract:    MULTICHAIN_CONTRACT_TESTNET,
    ...CHAIN_CONFIG[getTokenSymbol(chainDetails)],
  };
  // chain is the slip044 chain id
  if (chainDetails.chain === 60) {
    const derivedAddress = await fetchDerivedEVMAddress(accountId, derivedPath, networkId, getMultiChainContract());
    if (derivedAddress !== signMultichainRequest.from) {
      return {
        success:      false,
        errorMessage: 'Derived address does not match the provided from address',
      };
    }
    return signAndSendEVMTransaction({
      transaction: {
        to:                   signMultichainRequest.to,
        value:                signMultichainRequest.value.toString(),
        derivedPath,
        gasLimit:             (feeProperties as EVMFeeProperties)?.gasLimit,
        maxFeePerGas:         (feeProperties as EVMFeeProperties)?.maxFeePerGas,
        maxPriorityFeePerGas: (feeProperties as EVMFeeProperties)?.maxPriorityFeePerGas,
      },
      nearAuthentication: { networkId, keypair, accountId },
      fastAuthRelayerUrl: FAST_AUTH_RELAYER_URL,
      chainConfig
    });
  }

  const derivedAddress = await fetchDerivedBTCAddress(
    accountId,
    derivedPath,
    (signMultichainRequest as BTCSendMultichainMessage).network === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet,
    networkId,
    getMultiChainContract()
  );

  if (derivedAddress !== signMultichainRequest.from) {
    return {
      success:      false,
      errorMessage: 'Derived address does not match the provided from address',
    };
  }

  return signAndSendBTCTransaction({
    transaction: {
      to:                   signMultichainRequest.to,
      value:                signMultichainRequest.value.toString(),
      derivedPath,
      inputs:  (feeProperties as BTCFeeProperties)?.inputs,
      outputs: (feeProperties as BTCFeeProperties)?.outputs,
    },
    nearAuthentication: { networkId, keypair, accountId },
    fastAuthRelayerUrl: FAST_AUTH_RELAYER_URL,
    chainConfig
  });
};

export const multichainGetFeeProperties = async ({
  chain,
  to,
  value,
  from
}: {
  chain: number;
  to: string;
  value: string;
  from: string;
}) => {
  // chain is the slip044 chain id
  if (chain === 0) {
    const feeProperties =  (await fetchBTCFeeProperties(CHAIN_CONFIG.BTC.providerUrl, from, [{
      address: to,
      value:   Number(value)
    }]));

    return { ...feeProperties, feeDisplay: toBTC(feeProperties.fee) };
  } if (chain === 60) {
    const feeProperties = await fetchEVMFeeProperties(CHAIN_CONFIG.ETH.providerUrl, {
      to,
      value
    });
    return { ...feeProperties, feeDisplay: formatUnits(feeProperties.maxFee) };
  }
  return null;
};
