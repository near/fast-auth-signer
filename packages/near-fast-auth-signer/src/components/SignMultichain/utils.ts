import { formatEther, formatUnits } from 'ethers';
import {
  fetchBTCFeeProperties,
  fetchEVMFeeProperties,
  signAndSendEVMTransaction,
  signAndSendBTCTransaction,
  EVMRequest,
  SLIP044ChainId,
  fetchDerivedBTCAddressAndPublicKey,
  BitcoinRequest,
  BTCChainConfigWithProviders
} from 'multichain-tools';
import * as yup from 'yup';

import { SendBTCMultichainMessageSchema } from './bitcoin/schema';
import { SendEVMMultichainMessageSchema } from './evm/schema';
import {
  Chain,
  ChainMap,
  EVMChainMap,
  SendMultichainMessage,
} from './types';
import { assertNever } from '../../utils';
import { networkId } from '../../utils/config';
import environment from '../../utils/environment';
import { fetchGeckoPrices } from '../Sign/Values/fiatValueManager';

// TODO: use this for blacklisting on limited access key creation AND sign
const MULTICHAIN_CONTRACT_TESTNET = 'v2.multichain-mpc.testnet';
const MULTICHAIN_CONTRACT_MAINNET = 'v2.multichain-mpc.testnet';

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

export type TransactionFeeProperties = BTCFeeProperties | EVMFeeProperties;

const EVMChains: EVMChainMap<boolean> = {
  ETH: true,
  BNB: true,
};
export const isTokenSymbolEVMChain = (chain: Chain): boolean => !!EVMChains[chain];

const FAST_AUTH_RELAYER_URL = 'https://near-relayer-testnet.api.pagoda.co';

const CHAIN_CONFIG: ChainMap = {
  ETH: {
    providerUrl: environment.NETWORK_ID === 'mainnet'
      ? process.env.ETH_PROVIDER_URL_MAINNET : process.env.ETH_PROVIDER_URL_TESTNET,
  },
  BNB: {
    providerUrl: environment.NETWORK_ID === 'mainnet'
      ? process.env.BNB_PROVIDER_URL_MAINNET : process.env.BNB_PROVIDER_URL_TESTNET,
  },
  BTC: {
    networkType: environment.NETWORK_ID || 'testnet',
    // API ref: https://github.com/Blockstream/esplora/blob/master/API.md
    providerUrl: environment.NETWORK_ID === 'mainnet'
      ? process.env.BTC_PROVIDER_URL_MAINNET : process.env.BTC_PROVIDER_URL_TESTNET,
  },
};

export const getMultiChainContract = () => (environment.NETWORK_ID === 'mainnet'
  ? MULTICHAIN_CONTRACT_MAINNET : MULTICHAIN_CONTRACT_TESTNET);

const SendMultichainMessageSchema = yup.lazy((value: SendMultichainMessage) => {
  // chain is the slip044 chain id
  if (value.derivationPath.chain === 60) {
    return SendEVMMultichainMessageSchema;
  }
  if (value.derivationPath.chain === 0) {
    return SendBTCMultichainMessageSchema;
  }

  return null;
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

type ChainDetails = { chain: SLIP044ChainId; chainId?: bigint };

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
  if (chainDetails.chain === 0) {
    return 'BTC';
  }
  try {
    assertNever(chainDetails.chain);
    // unreachable
    return null;
  } catch (e) {
    return null;
  }
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

  if (chainDetails.chain === 0) {
    return 'bitcoin';
  }

  try {
    assertNever(chainDetails.chain);
    // unreachable
    return null;
  } catch (e) {
    return null;
  }
};

export const multichainAssetToNetworkName = (chainDetails: ChainDetails) => {
  // chain is the slip044 chain id
  if (chainDetails.chain === 60) {
    return {
      1:        'Ethereum Mainnet',
      56:       'Binance Smart Chain Mainnet',
      97:       'Binance Smart Chain Testnet',
      11155111: 'Ethereum Sepolia Network'
    }[Number(chainDetails.chainId)];
  }

  if (chainDetails.chain === 0) {
    return 'Bitcoin Network';
  }

  try {
    assertNever(chainDetails.chain);
    // unreachable
    return null;
  } catch (e) {
    return null;
  }
};

export async function getMultichainCoinGeckoPrice(chainDetails: ChainDetails) {
  return fetchGeckoPrices(multichainAssetToCoinGeckoId(chainDetails));
}

const convertTokenToReadable = (value : SendMultichainMessage['transaction']['value'], chain: SLIP044ChainId) => {
  // chain is the slip044 chain id
  if (chain === 60) {
    return parseFloat(formatEther(value));
  }
  if (chain === 0) {
    return toBTC(Number(value));
  }
  try {
    assertNever(chain);
    // unreachable
    return null;
  } catch (e) {
    return Number(value);
  }
};

export const getTokenAndTotalPrice = async (message: SendMultichainMessage) => {
  const chainDetails = {
    chain:   message.derivationPath.chain,
    chainId: BigInt((message as EVMRequest)?.transaction?.chainId)
  };

  const id = multichainAssetToCoinGeckoId(chainDetails);
  const tokenAmount = convertTokenToReadable(message.transaction.value, message.derivationPath.chain);

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
  signMultichainRequest: SendMultichainMessage;
  feeProperties: TransactionFeeProperties;
}) => {
  const accountId = window.fastAuthController.getAccountId();
  const keypair = await window.fastAuthController.getKey(accountId);

  const chainConfig = {
    contract:    MULTICHAIN_CONTRACT_TESTNET,
    ...CHAIN_CONFIG[getTokenSymbol({
      chain:   signMultichainRequest.derivationPath.chain,
      chainId: BigInt((signMultichainRequest as EVMRequest)?.transaction?.chainId)
    })],
  };

  const signMultiChainWithFee: EVMRequest | BitcoinRequest = {
    nearAuthentication: { networkId, keypair, accountId },
    fastAuthRelayerUrl: FAST_AUTH_RELAYER_URL,
    ...signMultichainRequest,
    chainConfig:        {
      ...chainConfig,
      ...signMultichainRequest.chainConfig,
    },
    transaction:        {
      ...signMultichainRequest.transaction,
      ...feeProperties,
    }
  };

  // chain is the slip04 chain id
  if (signMultichainRequest.derivationPath.chain === 60) {
    return signAndSendEVMTransaction(signMultiChainWithFee);
  }

  if (signMultichainRequest.derivationPath.chain === 0) {
    return signAndSendBTCTransaction({
      chainConfig:        chainConfig as BTCChainConfigWithProviders,
      ...signMultiChainWithFee as BitcoinRequest,
    });
  }

  return {
    success:      false,
    errorMessage: 'Chain not supported',
  };
};

export const multichainGetFeeProperties = async (request: SendMultichainMessage, signerId: string) => {
  if (request.derivationPath.chain === 0) {
    const { address } = await fetchDerivedBTCAddressAndPublicKey({
      signerId,
      path:                 request.derivationPath,
      btcNetworkId:         (request as BitcoinRequest).chainConfig.network,
      nearNetworkId:        environment.NETWORK_ID,
      multichainContractId:       getMultiChainContract(),
    });

    const feeProperties =  (await fetchBTCFeeProperties(CHAIN_CONFIG.BTC.providerUrl, address, [{
      address: request.transaction.to,
      value:   Number(request.transaction.value)
    }]));

    return { ...feeProperties, feeDisplay: toBTC(feeProperties.fee) };
  } if (request.derivationPath.chain === 60) {
    const feeProperties = await fetchEVMFeeProperties(CHAIN_CONFIG.ETH.providerUrl, request.transaction);
    return { ...feeProperties, feeDisplay: formatUnits(feeProperties.maxFee) };
  }

  return null;
};
