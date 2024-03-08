import * as bitcoin from 'bitcoinjs-lib';
import { Account } from 'near-api-js';

import { Bitcoin } from './chains/Bitcoin';
import EVM from './chains/EVM';

type BaseTransaction = {
  to: string;
  value: string;
  derivedPath: string
};

type EVMTransaction = BaseTransaction

type BTCTransaction = BaseTransaction

type BaseChainConfig = {
  providerUrl: string,
  scanUrl: string,
}

type EVMChainConfig = {
  type: 'EVM',
}

type BTCChainConfig = {
  type: 'BTC'
  networkType: 'bitcoin' | 'testnet'
}

type ChainConfig = EVMChainConfig | BTCChainConfig

type RequestChainConfig = BaseChainConfig & ChainConfig

type Request = {
  transaction: EVMTransaction | BTCTransaction;
  chainConfig: RequestChainConfig;
  account: Account;
  fastAuthRelayerUrl: string;
};

type SuccessResponse = {
  transactionHash: string;
  success: true;
}

type FailureResponse = {
  success: false;
  errorMessage: string;
}

type Response = SuccessResponse | FailureResponse

const MPC_ROOT_PUBLIC_KEY =  'secp256k1:4HFcTSodRLVCGNVcGc4Mf2fwBBBxv9jxkGdiW2S2CA1y6UpVVRWKj6RX7d7TDt65k2Bj3w9FU4BGtt43ZvuhCnNt';

const signAndSend = async (req: Request): Promise<Response> => {
  try {
    let txid: string;

    if (req.chainConfig.type === 'EVM') {
      const evm = new EVM({ ...req.chainConfig, relayerUrl: req.fastAuthRelayerUrl });

      txid = (await evm.handleTransaction(
        req.transaction,
        req.account,
        req.transaction.derivedPath,
        MPC_ROOT_PUBLIC_KEY
      )).hash;
    } else if (req.chainConfig.type === 'BTC') {
      const btc = new Bitcoin({ ...req.chainConfig, relayerUrl: req.fastAuthRelayerUrl });

      txid = await btc.handleTransaction(
        { ...req.transaction, value: parseFloat(req.transaction.value) },
        req.account,
        req.transaction.derivedPath,
        MPC_ROOT_PUBLIC_KEY
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

export const getDerivedAddress = async (signerId: string, path: string, chainConfig: ChainConfig) => {
  let derivedAddress: string;

  switch (chainConfig.type) {
    case 'EVM':
      derivedAddress = await EVM.deriveAddress(signerId, path, MPC_ROOT_PUBLIC_KEY);
      break;
    case 'BTC':
      derivedAddress = (await Bitcoin.deriveAddress(
        signerId,
        path,
        MPC_ROOT_PUBLIC_KEY,
        chainConfig.networkType === 'testnet' ? bitcoin.networks.testnet : bitcoin.networks.bitcoin
      )).address;
      break;
    default:
      throw new Error('Unsupported chain config');
  }

  return derivedAddress;
};

/**
 * Estimates the gas required for a transaction on the EVM chain.
 *
 * @param {object} transaction - The transaction object to estimate gas for.
 * @param {string} chainType - The type of chain, e.g., 'EVM'.
 * @returns {Promise<bigint>} The estimated gas required for the transaction.
 */
// export const getEstimatedFee = async (transaction: object, chainType: string): Promise<bigint> => {
//   if (chainType === 'EVM') {
//     try {
//       // Assuming CHAIN_CONFIG is defined elsewhere and accessible here
//       const evm = new EVM({ ...CHAIN_CONFIG.evm, relayerUrl: '' }); // Updated to use CHAIN_CONFIG
//       const estimatedGas = await evm.estimateGas(transaction);
//       return estimatedGas;
//     } catch (error) {
//       console.error('Error estimating gas:', error);
//       throw new Error('Failed to estimate gas.');
//     }
//   } else {
//     throw new Error(`Unsupported chain type: ${chainType}`);
//   }
// };

export default signAndSend;
