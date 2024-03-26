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

export type SLIP044ChainId = 60 | 0;

interface BaseSendMultichainMessage {
  chain: SLIP044ChainId;
  domain?: string;
  to: string;
  value: bigint;
  meta?: { [k: string]: any };
  from: string;
}

export type EvmSendMultichainMessage = BaseSendMultichainMessage & {
  chainId: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  gasLimit?: number;
};

export type BTCSendMultichainMessage = BaseSendMultichainMessage & {
  network: 'mainnet' | 'testnet';
};

export type SendMultichainMessage = BTCSendMultichainMessage | EvmSendMultichainMessage;
