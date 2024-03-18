import { ethers } from 'ethers';

/**
 * Estimates the amount of gas that a transaction will consume.
 *
 * This function calls the underlying JSON RPC's `estimateGas` method to
 * predict how much gas the transaction will use. This is useful for setting
 * gas limits when sending a transaction to ensure it does not run out of gas.
 *
 * @param {string} providerUrl - The providerUrl of the EVM network to query the fee properties from.
 * @param {ethers.TransactionLike} transaction - The transaction object for which to estimate gas. This function only requires the `to`, `value`, and `data` fields of the transaction object.
 * @returns {Promise<bigint>} A promise that resolves to the estimated gas amount as a bigint.
 */
export async function getEVMFeeProperties(
  providerUrl: string,
  transaction: ethers.TransactionLike
): Promise<{
  gasLimit: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  maxFee: bigint;
}> {
  const provider = new ethers.JsonRpcProvider(providerUrl);
  const gasLimit = await provider.estimateGas(transaction);
  const feeData = await provider.getFeeData();

  const maxFeePerGas = feeData.maxFeePerGas ?? ethers.parseUnits('10', 'gwei');
  const maxPriorityFeePerGas =    feeData.maxPriorityFeePerGas ?? ethers.parseUnits('10', 'gwei');

  return {
    gasLimit,
    maxFeePerGas,
    maxPriorityFeePerGas,
    maxFee: maxFeePerGas * gasLimit,
  };
}
