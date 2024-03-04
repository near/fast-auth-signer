import { ethers } from 'ethers';

// eslint-disable-next-line import/no-cycle
import { BaseTxParams } from '../types';

export interface EthTxParams extends BaseTxParams {
  to: string;
  value: ethers.BigNumberish;
  chainId: ethers.BigNumberish;
}
