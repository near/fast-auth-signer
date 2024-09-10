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
  BTCChainConfigWithProviders,
  fetchDerivedEVMAddress,
} from 'multichain-tools';
import * as yup from 'yup';

import { assertNever } from '../../../utils';
import { networkId } from '../../../utils/config';
import environment from '../../../utils/environment';
import { fetchGeckoPrices } from '../../Sign/Values/fiatValueManager';
import { SendBTCMultichainMessageSchema } from '../bitcoin/schema';
import { SendEVMMultichainMessageSchema } from '../evm/schema';
import {
  ChainMap,
  SendMultichainMessage,
} from '../types';

// TODO: use this for blacklisting on limited access key creation AND sign
const MULTICHAIN_CONTRACT_TESTNET = 'v1.signer-prod.testnet';
const MULTICHAIN_CONTRACT_MAINNET = 'v1.signer-prod.testnet';

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
  outputs: ({
    address: string;
    value: number;
  } | {
    script: Buffer;
    value: number;
  })[];
  fee: number;
};

type EVMFeeProperties = {
  gasLimit: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  maxFee: bigint;
}

export type TransactionFeeProperties = BTCFeeProperties | EVMFeeProperties;

const FAST_AUTH_RELAYER_URL = 'https://near-relayer-testnet.api.pagoda.co';

export const CHAIN_CONFIG: ChainMap = {
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

export interface ChainConfig {
  providerUrl: string;
  networkType?: string;
}

export const getMultichainAssetInfo = (message: SendMultichainMessage): {
  tokenSymbol: string;
  coinGeckoId: string;
  networkName: string;
  chainConfig: ChainConfig;
} | null => {
  if (message.derivationPath.chain === 60) {
    const chainId = BigInt((message as EVMRequest)?.transaction?.chainId);
    switch (chainId) {
      case BigInt(1):
      case BigInt(11155111):
        return {
          tokenSymbol: 'ETH',
          coinGeckoId: 'ethereum',
          networkName: chainId === BigInt(1) ? 'Ethereum Mainnet' : 'Ethereum Sepolia Network',
          chainConfig: { ...CHAIN_CONFIG.ETH, ...message.chainConfig }
        };
      case BigInt(56):
      case BigInt(97):
        return {
          tokenSymbol: 'BNB',
          coinGeckoId: 'binancecoin',
          networkName: chainId === BigInt(56) ? 'Binance Smart Chain Mainnet' : 'Binance Smart Chain Testnet',
          chainConfig: { ...CHAIN_CONFIG.BNB, ...message.chainConfig }
        };
      default:
        throw new Error('Chain not supported');
    }
  }

  if (message.derivationPath.chain === 0) {
    return {
      tokenSymbol: 'BTC',
      coinGeckoId: 'bitcoin',
      networkName: 'Bitcoin Network',
      chainConfig: { ...CHAIN_CONFIG.BTC, ...message.chainConfig }
    };
  }

  return null;
};

const convertTokenToReadable = (value: SendMultichainMessage['transaction']['value'], chain: SLIP044ChainId) => {
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
  const { coinGeckoId: id } = getMultichainAssetInfo(message);
  const tokenAmount = convertTokenToReadable(message.transaction.value, message.derivationPath.chain);

  if (id) {
    const res = await fetchGeckoPrices(id);
    if (!res) {
      return {
        price: 0,
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
    price: 0,
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
    contract: MULTICHAIN_CONTRACT_TESTNET,
    ...getMultichainAssetInfo(signMultichainRequest)?.chainConfig,
  };

  const signMultiChainWithFee: EVMRequest | BitcoinRequest = {
    nearAuthentication: {
      networkId, keypair, accountId
    },
    fastAuthRelayerUrl: FAST_AUTH_RELAYER_URL,
    ...signMultichainRequest,
    chainConfig:        {
      ...chainConfig,
      ...signMultichainRequest.chainConfig,
    },
    transaction: {
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
      chainConfig: chainConfig as BTCChainConfigWithProviders,
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
      multichainContractId: getMultiChainContract(),
    });

    const feeProperties = (await fetchBTCFeeProperties(
      getMultichainAssetInfo(request)?.chainConfig.providerUrl,
      address,
      [{
        address: request.transaction.to,
        value:   Number(request.transaction.value)
      }]
    ));

    return { ...feeProperties, feeDisplay: toBTC(feeProperties.fee) };
  } if (request.derivationPath.chain === 60) {
    const address = await fetchDerivedEVMAddress({
      signerId,
      path:                 request.derivationPath,
      nearNetworkId:        environment.NETWORK_ID,
      multichainContractId: getMultiChainContract(),
    });

    let providerUrl: string;
    const chainId = BigInt((request as EVMRequest).transaction.chainId);
    switch (chainId) {
      case BigInt(11155111):
        providerUrl = getMultichainAssetInfo(request)?.chainConfig.providerUrl;
        break;
      case BigInt(97):
        providerUrl = getMultichainAssetInfo(request)?.chainConfig.providerUrl;
        break;
      default:
        throw new Error('Chain not supported');
    }

    const feeProperties = await fetchEVMFeeProperties(
      providerUrl,
      { ...request.transaction, from: address }
    );
    return { ...feeProperties, feeDisplay: formatUnits(feeProperties.maxFee) };
  }

  return null;
};
