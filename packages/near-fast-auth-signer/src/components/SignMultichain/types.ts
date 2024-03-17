export type EVMChain = 'ETH' | 'BNB';
export type Chain = EVMChain | 'BTC';

export type EVMChainMap<T = any> = {
  // Disabling because the key needs to be defined but not used
  // eslint-disable-next-line no-unused-vars
  [key in EVMChain]: T
};

export type ChainMap<T = any> = {
  // Disabling because the key needs to be defined but not used
  // eslint-disable-next-line no-unused-vars
  [key in Chain]: T
};

export interface DerivationPathDeserialized {
  asset: Chain;
  domain?: string;
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
       from: string;
     }
   | {
       fee: number;
       utxos: any[];
       from: string;
     }
 )

export type MultichainInterface = BTCInterface | EVMInterface;
