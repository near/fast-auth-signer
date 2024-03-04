// eslint-disable-next-line import/no-cycle
import { EthTxParams } from './ethereum/types';

export type DerivationPathDeserialized = {
  asset: 'ETH' | 'BNB' | 'BTC';
  domain?: string;
};

export interface BaseTxParams {
  nearAccountId: string;
  derivationPath: string;
}

export type MultichainIframeMessage = EthTxParams
