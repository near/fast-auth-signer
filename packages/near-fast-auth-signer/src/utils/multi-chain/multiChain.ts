import * as bitcoin from 'bitcoinjs-lib';
import { BigNumberish } from 'ethers';

import { Bitcoin } from './chains/Bitcoin';
import EVM from './chains/EVM';
import {
  BTCChainConfigWithProviders,
  BTCTransaction,
  ChainSignatureContracts,
  EVMChainConfigWithProviders,
  EVMTransaction,
  Request,
  Response,
} from './chains/types';

export const signAndSendEVMTransaction = async (
  req: Request
): Promise<Response> => {
  try {
    const evm = new EVM({
      ...req.chainConfig,
      relayerUrl: req.fastAuthRelayerUrl,
    });

    const { hash } = await evm.handleTransaction(
      req.transaction as EVMTransaction,
      req.nearAuthentication,
      req.transaction.derivedPath
    );

    return {
      transactionHash: hash,
      success:         true,
    };
  } catch (e) {
    return {
      success:      false,
      errorMessage: e.message,
    };
  }
};

export const signAndSendBTCTransaction = async (
  req: Request
): Promise<Response> => {
  try {
    const btc = new Bitcoin({
      ...(req.chainConfig as BTCChainConfigWithProviders),
      relayerUrl: req.fastAuthRelayerUrl,
    });

    const txid = await btc.handleTransaction(
      req.transaction as BTCTransaction,
      req.nearAuthentication,
      req.transaction.derivedPath
    );

    return {
      transactionHash: txid,
      success:         true,
    };
  } catch (e) {
    return {
      success:      false,
      errorMessage: e.message,
    };
  }
};

export const getDerivedBTCAddress = async (
  signerId: string,
  derivationPath: string,
  bitcoinNetwork: 'mainnet' | 'testnet',
  nearNetworkId: 'mainnet' | 'testnet',
  multichainContractId: ChainSignatureContracts
) => (
  await Bitcoin.deriveAddress(
    signerId,
    derivationPath,
    bitcoinNetwork === 'testnet'
      ? bitcoin.networks.testnet
      : bitcoin.networks.bitcoin,
    nearNetworkId,
    multichainContractId
  )
).address;

export const getDerivedEVMAddress = EVM.deriveAddress;

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
  chainConfig: EVMChainConfigWithProviders
): Promise<bigint> => (await EVM.getFeeProperties(chainConfig.providerUrl, transaction)).maxFee;

/**
 * Calculates the estimated fee for a Bitcoin transaction in satoshis.
 *
 * @param {string} providerUrl - The Bitcoin provider url to request the fee properties from
 * @param {string} transaction.from - The Bitcoin address from which the transaction is sent.
 * @param {Array} transaction.targets - An array of objects, each containing the target address and value in satoshis to send.
 * @returns {Promise<number>} The estimated transaction fee in satoshis.
 */
export const getBitcoinFeeProperties = Bitcoin.getFeeProperties;
