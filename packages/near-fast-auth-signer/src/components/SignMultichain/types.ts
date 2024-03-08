import { KeyPair } from 'near-api-js';

export interface DerivationPathDeserialized {
  asset: 'ETH' | 'BNB' | 'BTC';
  domain?: string;
}

export interface MultichainExecutionResponse {
  success: Boolean;
  transactionHash?: string;
  errorMessage?: string;
}

export interface ChainUrls {
 [chain: string]: {
    providerUrl: string;
    scanUrl: string;
    name: string;
 };
}

export interface InitializationConfig {
 chainUrls: ChainUrls;
 mpcRecoveryUrl?: string;
 authInfo: KeyPair | { frp_keypair: KeyPair; oidc_token: string; };
 mpcContractAccountId: string;
 fastAuthRelayerUrl: string;
}

export interface BaseChainInterface {
 to: string;
 value: bigint;
 derivationPath: string;
}

export interface EVMInterface extends BaseChainInterface {
 chainId: bigint;
 maxFeePerGas?: bigint;
 maxPriorityFeePerGas?: bigint;
 gasLimit?: number;
}

export type BTCInterface = BaseChainInterface &
 (
   | {
       derivedPublicKey: string;
     }
   | {
       fee: number;
       utxos: any[];
       derivedPublicKey: string;
     }
 )

export type MultichainInterface = BTCInterface | EVMInterface;
