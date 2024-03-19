import axios from 'axios';
import * as bitcoin from 'bitcoinjs-lib';
import coinselect from 'coinselect';
import { BigNumberish, ethers } from 'ethers';

import { UTXO } from '../chains/Bitcoin/types';
import { EVMChainConfigWithProviders } from '../chains/EVM/types';
import { ChainSignatureContracts, NearNetworkIds } from '../chains/types';
import { generateBTCAddress, generateEthereumAddress } from '../kdf/kdf';
import { getRootPublicKey } from '../signature';

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
export async function fetchEVMFeeProperties(
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

/**
 * Calculates the estimated maximum fee for an EVM transaction.
 *
 * @param {Object} transaction - The transaction details including the recipient's address, value, and data.
 * @param {EVMChainConfigWithProviders} chainConfig - The configuration object for the EVM chain, including provider URLs and other relevant settings.
 * @returns {Promise<bigint>} The estimated maximum transaction fee in wei.
 */
export const fetchEstimatedEVMFee = async (
  transaction: {
    to: string;
    value?: BigNumberish;
    data?: string;
  },
  chainConfig: EVMChainConfigWithProviders
): Promise<bigint> => (await fetchEVMFeeProperties(chainConfig.providerUrl, transaction)).maxFee;

/**
 * Derives an Ethereum address for a given signer ID and derivation path.
 *
 * This method leverages the root public key associated with the signer ID to generate an Ethereum address
 * and public key based on the specified derivation path.
 *
 * @param {string} signerId - The identifier of the signer.
 * @param {string} path - The derivation path used for generating the address.
 * @param {string} nearNetworkId - The near network id used to interact with the NEAR blockchain.
 * @param {ChainSignatureContracts} multichainContractId - The contract identifier used to get the root public key.
 * @returns {Promise<string>} A promise that resolves to the derived Ethereum address.
 */
export async function fetchDerivedEVMAddress(
  signerId: string,
  path: string,
  nearNetworkId: NearNetworkIds,
  multichainContractId: ChainSignatureContracts
): Promise<string> {
  const contractRootPublicKey = await getRootPublicKey(
    multichainContractId,
    nearNetworkId
  );

  return generateEthereumAddress(signerId, path, contractRootPublicKey);
}

/**
 * Fetches the current fee rate from the Bitcoin network.
 * This method queries the RPC endpoint for fee estimates and returns the fee rate
 * expected for a transaction to be confirmed within a certain number of blocks.
 * The confirmation target is set to 6 blocks by default, which is commonly used
 * for a balance between confirmation time and cost.
 *
 * @returns {Promise<number>} A promise that resolves to the fee rate in satoshis per byte.
 * @throws {Error} Throws an error if the fee rate data for the specified confirmation target is missing.
 */
export async function fetchBTCFeeRate(
  providerUrl: string,
  confirmationTarget = 6
): Promise<number> {
  const response = await axios.get(`${providerUrl}fee-estimates`);
  if (response.data && response.data[confirmationTarget]) {
    return response.data[confirmationTarget];
  }
  throw new Error(
    `Fee rate data for ${confirmationTarget} blocks confirmation target is missing in the response`
  );
}

/**
 * Fetches the Unspent Transaction Outputs (UTXOs) for a given Bitcoin address.
 *
 * @param {string} address - The Bitcoin address for which to fetch the UTXOs.
 * @returns {Promise<UTXO[]>} A promise that resolves to an array of UTXOs.
 * Each UTXO is represented as an object containing the transaction ID (`txid`), the output index within that transaction (`vout`),
 * the value of the output in satoshis (`value`) and the locking script (`script`).
 */
export async function fetchBTCUTXOs(
  providerUrl: string,
  address: string
): Promise<UTXO[]> {
  try {
    const response = await axios.get(`${providerUrl}address/${address}/utxo`);
    const utxos = response.data.map((utxo: any) => {
      return {
        txid:   utxo.txid,
        vout:   utxo.vout,
        value:  utxo.value,
        script: utxo.script,
      };
    });
    return utxos;
  } catch (error) {
    console.error('Failed to fetch UTXOs:', error);
    return [];
  }
}

/**
 * Calculates the fee properties for a Bitcoin transaction.
 * This function fetches the Unspent Transaction Outputs (UTXOs) for the given address,
 * and the fee rate for the specified confirmation target. It then uses the `coinselect` algorithm
 * to select the UTXOs to be spent and calculates the fee required for the transaction.
 *
 * @param {string} providerUrl - The Bitcoin provider url to request the fee properties from
 * @param {string} from - The Bitcoin address from which the transaction is to be sent.
 * @param {Array<{address: string, value: number}>} targets - An array of target addresses and values (in satoshis) to send.
 * @param {number} [confirmationTarget=6] - The desired number of blocks in which the transaction should be confirmed.
 * @returns {Promise<{inputs: UTXO[], outputs: {address: string, value: number}[], fee: number}>} A promise that resolves to an object containing the inputs (selected UTXOs), outputs (destination addresses and values), and the transaction fee in satoshis.
 */
export async function fetchBTCFeeProperties(
  providerUrl: string,
  from: string,
  targets: {
    address: string;
    value: number;
  }[],
  confirmationTarget = 6
): Promise<{
  inputs: UTXO[];
  outputs: { address: string; value: number }[];
  fee: number;
}> {
  const utxos = await fetchBTCUTXOs(providerUrl, from);
  const feeRate = await fetchBTCFeeRate(providerUrl, confirmationTarget);

  // Add a small amount to the fee rate to ensure the transaction is confirmed
  const ret = coinselect(utxos, targets, feeRate + 1);

  if (!ret.inputs || !ret.outputs) {
    throw new Error(
      'Invalid transaction: coinselect failed to find a suitable set of inputs and outputs. This could be due to insufficient funds, or no inputs being available that meet the criteria.'
    );
  }

  return ret;
}

/**
 * Derives a Bitcoin address and its corresponding public key for a given signer ID and derivation path.
 * This method utilizes the root public key associated with the signer ID to generate a Bitcoin address
 * and public key buffer based on the specified derivation path and network.
 *
 * @param {string} signerId - The unique identifier of the signer.
 * @param {string} path - The derivation path used to generate the address.
 * @param {bitcoin.networks.Network} network - The Bitcoin network (e.g., mainnet, testnet).
 * @param {string} nearNetworkId - The network id used to interact with the NEAR blockchain.
 * @param {ChainSignatureContracts} contract - The mpc contract's accountId on the NEAR blockchain.
 * @returns {Promise<{ address: string; publicKey: Buffer }>} An object containing the derived Bitcoin address and its corresponding public key buffer.
 */
export async function fetchDerivedBTCAddressAndPublicKey(
  signerId: string,
  path: string,
  network: bitcoin.networks.Network,
  nearNetworkId: NearNetworkIds,
  contract: ChainSignatureContracts
): Promise<{ address: string; publicKey: Buffer }> {
  const contractRootPublicKey = await getRootPublicKey(contract, nearNetworkId);

  const derivedKey = await generateBTCAddress(
    signerId,
    path,
    contractRootPublicKey
  );

  const publicKeyBuffer = Buffer.from(derivedKey, 'hex');

  const { address } = bitcoin.payments.p2pkh({
    pubkey: publicKeyBuffer,
    network,
  });

  return { address, publicKey: publicKeyBuffer };
}

/**
 * Derives a Bitcoin address and its corresponding public key for a given signer ID and derivation path.
 * This method utilizes the root public key associated with the signer ID to generate a Bitcoin address
 * and public key buffer based on the specified derivation path and network.
 *
 * @param {string} signerId - The unique identifier of the signer.
 * @param {string} path - The derivation path used to generate the address.
 * @param {bitcoin.networks.Network} network - The Bitcoin network (e.g., mainnet, testnet).
 * @param {string} nearNetworkId - The network id used to interact with the NEAR blockchain.
 * @param {ChainSignatureContracts} contract - The mpc contract's accountId on the NEAR blockchain.
 * @returns {Promise<string>} the derived Bitcoin address.
 */
export async function fetchDerivedBTCAddress(
  signerId: string,
  path: string,
  network: bitcoin.networks.Network,
  nearNetworkId: NearNetworkIds,
  contract: ChainSignatureContracts
): Promise<string> {
  return fetchDerivedBTCAddressAndPublicKey(
    signerId,
    path,
    network,
    nearNetworkId,
    contract
  ).then(({ address }) => address);
}
