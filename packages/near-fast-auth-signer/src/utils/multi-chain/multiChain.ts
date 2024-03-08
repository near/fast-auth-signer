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

type EVMChainConfig = BaseChainConfig & {
  type: 'EVM'

}

type BTCChainConfig = BaseChainConfig & {
  type: 'BTC'
  networkType: 'mainnet' | 'testnet'
}

type Request = {
  transaction: EVMTransaction | BTCTransaction;
  chainConfig: EVMChainConfig | BTCChainConfig
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
    }

    if (req.chainConfig.type === 'BTC') {
      const btc = new Bitcoin({ ...req.chainConfig, relayerUrl: req.fastAuthRelayerUrl });

      txid = await btc.handleTransaction(
        { ...req.transaction, value: parseFloat(req.transaction.value) },
        req.account,
        req.transaction.derivedPath,
        MPC_ROOT_PUBLIC_KEY
      );
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

export const getDerivedAddress = async (signerId: string, path: string, type: string) => {
  let derivedAddress: string;

  switch (type) {
    case 'EVM':
      derivedAddress = await EVM.deriveAddress(signerId, path, MPC_ROOT_PUBLIC_KEY);
      break;
    case 'BTC':
      derivedAddress = (await Bitcoin.deriveAddress(signerId, path, MPC_ROOT_PUBLIC_KEY)).address;
      break;
    default:
      throw new Error(`Unsupported type: ${type}. Only 'EVM' and 'BTC' are supported.`);
  }

  console.log({ derivedAddress });
};

export default signAndSend;
