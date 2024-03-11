import {
  ethers, keccak256, parseEther
} from 'ethers';
import { Account } from 'near-api-js';

import { generateEthereumAddress } from '../kdf/kdf-osman';
import { sign } from '../signature';

class EVM {
  private provider: ethers.JsonRpcProvider;

  private relayerUrl: string;

  /**
   * Initializes an EVM object with a specified configuration.
   *
   * @param {object} config - The configuration object for the EVM instance.
   * @param {string} [config.providerUrl] - The URL for the EVM JSON RPC provider.
   */
  constructor(config: { providerUrl: string; relayerUrl: string }) {
    this.provider = new ethers.JsonRpcProvider(config.providerUrl);
    this.relayerUrl = config.relayerUrl;
  }

  /**
   * Prepares a transaction object for signature by serializing and hashing it.
   *
   * @param {object} transaction - The transaction object to prepare.
   * @returns {string} The hashed transaction ready for signature.
   */
  static prepareTransactionForSignature(
    transaction: ethers.TransactionLike
  ): string {
    const serializedTransaction =      ethers.Transaction.from(transaction).unsignedSerialized;
    const transactionHash = keccak256(serializedTransaction);

    return transactionHash;
  }

  /**
   * Sends a signed transaction to the network for execution.
   *
   * @param {ethers.TransactionLike} transaction - The transaction object to be sent.
   * @param {ethers.SignatureLike} signature - The signature object associated with the transaction.
   * @returns {Promise<ethers.TransactionResponse>} A promise that resolves to the response of the executed transaction.
   */
  async sendSignedTransaction(
    transaction: ethers.TransactionLike,
    signature: ethers.SignatureLike
  ): Promise<ethers.TransactionResponse> {
    try {
      const serializedTransaction = ethers.Transaction.from(
        { ...transaction, signature }
      ).serialized;
      return this.provider.broadcastTransaction(serializedTransaction);
    } catch (error) {
      console.error('Transaction execution failed:', error);
      throw new Error('Failed to send signed transaction.');
    }
  }

  /**
   * Estimates the amount of gas that a transaction will consume.
   *
   * This function calls the underlying JSON RPC's `estimateGas` method to
   * predict how much gas the transaction will use. This is useful for setting
   * gas limits when sending a transaction to ensure it does not run out of gas.
   *
   * @param {ethers.TransactionLike} transaction - The transaction object for which to estimate gas. This function only requires the `to`, `value`, and `data` fields of the transaction object.
   * @returns {Promise<bigint>} A promise that resolves to the estimated gas amount as a bigint.
   */
  async getFeeProperties(
    transaction: ethers.TransactionLike
  ): Promise<{
  gasLimit: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  maxFee: bigint;
  }> {
    const gasLimit = await this.provider.estimateGas(transaction);
    const feeData = await this.provider.getFeeData();

    const maxFeePerGas =         feeData.maxFeePerGas ?? ethers.parseUnits('10', 'gwei');
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ?? ethers.parseUnits('10', 'gwei');

    return {
      gasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas,
      maxFee: maxFeePerGas * gasLimit
    };
  }

  /**
   * Enhances a transaction with current gas price, estimated gas limit, chain ID, and nonce.
   *
   * This method fetches the current gas price, estimates the gas limit required for the transaction, and retrieves the nonce for the transaction sender's address. It then returns a new transaction object that includes the original transaction details along with the fetched gas price, estimated gas limit, the chain ID of the EVM object, and the nonce.
   *
   * @param {ethers.providers.TransactionRequest} transaction - The initial transaction object without gas details or nonce.
   * @returns {Promise<ethers.providers.TransactionRequest>} A new transaction object augmented with gas price, gas limit, chain ID, and nonce.
   */
  async attachGasAndNonce(
    transaction: ethers.TransactionLike & {
      from: string;
    }
  ): Promise<ethers.TransactionLike> {
    const { gasLimit, maxFeePerGas, maxPriorityFeePerGas } = await this.getFeeProperties(transaction);
    const nonce = await this.provider.getTransactionCount(transaction.from, 'latest');

    const { from, ...rest } = transaction;

    return {
      ...rest,
      gasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas,
      chainId:              this.provider._network.chainId,
      nonce,
      type:                 2,
    };
  }

  /**
   * Fetches the balance of the given EVM address.
   *
   * This method uses the current provider to query the balance of the specified address.
   * The balance is returned in ethers as a string.
   *
   * @param {string} address - The EVM address to fetch the balance for.
   * @returns {Promise<string>} The balance of the address in ethers.
   */
  async getBalance(address: string): Promise<string> {
    try {
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error(`Failed to fetch balance for address ${address}:`, error);
      throw new Error('Failed to fetch balance.');
    }
  }

  /**
   * Derives an EVM address from a given signer ID, derivation path, and public key.
   *
   * @param {string} signerId - The unique identifier of the signer.
   * @param {string} path - The derivation path.
   * @param {string} contractRootPublicKey - The public key in base58 format.
   * @returns {string} The derived EVM address.
   *
   * @example
   * const signerId = "felipe.near";
   * const path = ",ethereum,near.org";
   * const contractRootPublicKey = "secp256k1:37aFybhUHCxRdDkuCcB3yHzxqK7N8EQ745MujyAQohXSsYymVeHzhLxKvZ2qYeRHf3pGFiAsxqFJZjpF9gP2JV5u";
   * const address = deriveAddress(signerId, path, contractRootPublicKey);
   * console.log(address); // 0x...
   */
  static async deriveAddress(
    signerId: string,
    path: string,
    contractRootPublicKey: string
  ): Promise<string> {
    return generateEthereumAddress(signerId, path, contractRootPublicKey);
  }

  /**
   * This method oversees the transaction's entire lifecycle, from preparation to execution on the blockchain. It handles gas and nonce calculation, digital signing, and broadcasting the transaction. Utilizing the provided chain instance, transaction details, account credentials, and a signing derivation path, it ensures seamless transaction execution.
   *
   * The signing is performed on-chain as detailed in @signature.ts, where a transaction hash is signed using the account's credentials and derivation path.
   *
   * @param {Transaction} data - The transaction details, including the recipient's address and the amount to be transferred.
   * @param {Account} account - Contains the account's credentials, such as the unique account ID.
   * @param {string} keyPath - The derivation path used for the transaction's signing process.
   * @param {string} contractRootPublicKey - The root public key from which new keys are derived based on the specified path.
   * @returns {Promise<ethers.TransactionResponse | undefined>} A promise that resolves to the response of the executed transaction, or undefined if the transaction could not be executed.
   */
  async handleTransaction(
    data: {to: string, value: string},
    account: Account,
    keyPath: string,
    contractRootPublicKey: string
  ): Promise<ethers.TransactionResponse | undefined> {
    const from = await EVM.deriveAddress(
      account?.accountId,
      keyPath,
      contractRootPublicKey
    );

    const transaction = await this.attachGasAndNonce({
      from,
      to:    data.to,
      value: parseEther(data.value),
    });

    const transactionHash = EVM.prepareTransactionForSignature(transaction);

    const signature = await sign(
      transactionHash,
      keyPath,
      account,
      this.relayerUrl
    );

    if (signature) {
      const r = `0x${signature.r}`;
      const s = `0x${signature.s}`;
      const v = [0, 1].find((currV) => {
        const address = ethers.recoverAddress(transactionHash, {
          r,
          s,
          v: currV,
        });

        return from.toLowerCase() === address.toLowerCase();
      });

      if (v === undefined) {
        throw new Error('Failed to recover address from signature.');
      }

      const transactionResponse = await this.sendSignedTransaction(
        transaction,
        ethers.Signature.from({ r, s, v })
      );

      return transactionResponse;
    }

    return undefined;
  }
}

export default EVM;
