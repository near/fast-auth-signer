import { Account } from '@near-js/accounts';
import * as bitcoin from 'bitcoinjs-lib';
import { BigNumberish } from 'ethers';

import { Bitcoin } from './chains/Bitcoin';
import EVM from './chains/EVM';
import {
  BTCChainConfigWithProviders,
  BTCTransaction,
  ChainConfig,
  EVMChainConfigWithProviders,
  EVMTransaction,
  Request,
  Response
} from './chains/types';
import { ChainSignatureContracts } from './signature';

const signAndSend = async (req: Request): Promise<Response> => {
  try {
    let txid: string;

    if (req.chainConfig.type === 'EVM') {
      const evm = new EVM({ ...req.chainConfig, relayerUrl: req.fastAuthRelayerUrl });

      txid = (await evm.handleTransaction(
        req.transaction as EVMTransaction,
        req.account,
        req.transaction.derivedPath,
      )).hash;
    } else if (req.chainConfig.type === 'BTC') {
      const btc = new Bitcoin({ ...req.chainConfig, relayerUrl: req.fastAuthRelayerUrl });

      txid = await btc.handleTransaction(
        req.transaction as BTCTransaction,
        req.account,
        req.transaction.derivedPath,
      );
    } else {
      throw new Error('Unsupported chain type');
    }

    return {
      transactionHash: txid,
      success:         true,
    };
  } catch (e) {
    return {
      success:      false,
      errorMessage: e.message
    };
  }
};

export const getDerivedAddress = async (
  signerId: string,
  path: string,
  chainConfig: ChainConfig,
  account: Account,
  contract: ChainSignatureContracts,
  relayerUrl: string
) => {
  let derivedAddress: string;

  switch (chainConfig.type) {
    case 'EVM':
      derivedAddress = await EVM.deriveAddress(signerId, path, account, contract, relayerUrl);
      break;
    case 'BTC':
      derivedAddress = (await Bitcoin.deriveAddress(
        signerId,
        path,
        chainConfig.networkType === 'testnet' ? bitcoin.networks.testnet : bitcoin.networks.bitcoin,
        account,
        contract,
        relayerUrl
      )).address;
      break;
    default:
      throw new Error('Unsupported chain config');
  }

  return derivedAddress;
};

/**
 * Calculates the estimated maximum fee for an EVM transaction.
 *
 * @param {Object} transaction - The transaction details including the recipient's address, value, and data.
 * @param {EVMChainConfigWithProviders} chainConfig - The configuration object for the EVM chain, including provider URLs and other relevant settings.
 * @returns {Promise<bigint>} The estimated maximum transaction fee in wei.
 */
export const getEstimatedFeeEVM = async (
  transaction: {
  to: string;
  value?: BigNumberish;
  data?: string;
},
  chainConfig: EVMChainConfigWithProviders,
  relayerUrl: string
): Promise<bigint> => {
  const evm = new EVM({ ...chainConfig, relayerUrl });
  return (await evm.getFeeProperties(transaction)).maxFee;
};

/**
 * Calculates the estimated fee for a Bitcoin transaction in satoshis.
 *
 * @param {Object} transaction - The transaction details including the sender's address and the targets.
 * @param {string} transaction.from - The Bitcoin address from which the transaction is sent.
 * @param {Array} transaction.targets - An array of objects, each containing the target address and value in satoshis to send.
 * @param {BTCChainConfigWithProviders} chainConfig - The configuration object for the Bitcoin chain, including network type and providers.
 * @returns {Promise<number>} The estimated transaction fee in satoshis.
 */
export const getEstimatedFeeBTC = async (transaction: {
  from: string,
  targets: {
    address: string,
    value: number
  }[]
}, chainConfig: BTCChainConfigWithProviders): Promise<number> => (
  await Bitcoin.getFeeProperties(
    chainConfig.providerUrl,
    transaction.from,
    transaction.targets
  )
).fee;

export const getBitcoinFeeProperties = Bitcoin.getFeeProperties;

export default signAndSend;
