import { Bitcoin } from './chains/Bitcoin/Bitcoin';
import { BitcoinRequest } from './chains/Bitcoin/types';
import EVM from './chains/EVM/EVM';
import { EVMRequest } from './chains/EVM/types';
import { Response } from './chains/types';

export const signAndSendEVMTransaction = async (
  req: EVMRequest
): Promise<Response> => {
  try {
    const evm = new EVM({
      ...req.chainConfig,
      relayerUrl: req.fastAuthRelayerUrl,
    });

    const { hash } = await evm.handleTransaction(
      req.transaction,
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
  req: BitcoinRequest
): Promise<Response> => {
  try {
    const btc = new Bitcoin({
      ...req.chainConfig,
      relayerUrl: req.fastAuthRelayerUrl,
    });

    const txid = await btc.handleTransaction(
      req.transaction,
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

export {
  fetchDerivedEVMAddress,
  fetchBTCFeeProperties,
  fetchDerivedBTCAddress,
  fetchEstimatedEVMFee,
  fetchEVMFeeProperties,
} from './utils';
