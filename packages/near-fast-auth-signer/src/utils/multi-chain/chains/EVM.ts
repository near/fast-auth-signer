import BN from 'bn.js';
import {
  ethers, keccak256, parseEther
} from 'ethers';
import { Account, transactions } from 'near-api-js';

// import { KeyDerivation } from '../kdf';
import { generateEthereumAddress } from '../kdf/kdf-osman';
import { signMPC } from '../signature';

class EVM {
  private provider: ethers.JsonRpcProvider;

  private scanUrl: string;

  private name: string;

  private relayerUrl: string;

  /**
   * Initializes an EVM object with a specified configuration.
   *
   * @param {object} config - The configuration object for the EVM instance.
   * @param {string} [config.providerUrl] - The URL for the EVM JSON RPC provider.
   */
  constructor(config: { providerUrl: string; scanUrl: string; name: string, relayerUrl: string }) {
    this.provider = new ethers.JsonRpcProvider(config.providerUrl);
    this.scanUrl = config.scanUrl;
    this.name = config.name;
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
   * Sends a signed transaction for execution.
   *
   * @param {string} signedTransaction - The signed transaction payload as a hex string.
   * @returns {Promise<string>} The transaction hash of the executed transaction.
   */
  async sendSignedTransaction(
    transaction: ethers.TransactionLike
  ): Promise<ethers.TransactionResponse> {
    try {
      const serializedTransaction = ethers.Transaction.from(
        transaction
      ).serialized;
      return this.provider.broadcastTransaction(serializedTransaction);
    } catch (error) {
      console.error('Transaction execution failed:', error);
      throw new Error('Failed to send signed transaction.');
    }
  }

  /**
   * Enhances a transaction with current gas price, estimated gas limit, and chain ID.
   *
   * This method fetches the current gas price and estimates the gas limit required for the transaction.
   * It then returns a new transaction object that includes the original transaction details
   * along with the fetched gas price, estimated gas limit, and the chain ID of the EVM object.
   *
   * @param {ethers.providers.TransactionRequest} transaction - The initial transaction object without gas details.
   * @returns {Promise<ethers.providers.TransactionRequest>} A new transaction object augmented with gas price, gas limit, and chain ID.
   */
  async attachGasAndNonce(
    transaction: Omit<ethers.TransactionLike, 'from'> & {
      from: string;
    }
  ): Promise<ethers.TransactionLike> {
    const feeData = (await this.provider.getFeeData());
    const gasLimit = await this.provider.estimateGas(transaction);
    const nonce = await this.provider.getTransactionCount(
      transaction.from,
      'latest'
    );

    const { from, ...rest } = transaction;

    return {
      ...rest,
      gasLimit,
      gasPrice:             feeData.gasPrice,
      // maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
      // maxFeePerGas:         feeData.maxFeePerGas,
      chainId:              this.provider._network.chainId,
      nonce,
      type:                 0,
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
   * This method combines the provided signer ID and path to generate an epsilon value,
   * which is then used to derive a new public key. The EVM address is then computed
   * from this derived public key.
   *
   * @param {string} signerId - The unique identifier of the signer.
   * @param {string} path - The derivation path.
   * @param {string} signerContractPublicKey - The public key in base58 format.
   * @returns {string} The derived EVM address.
   *
   * @example
   * const signerId = "felipe.near";
   * const path = ",ethereum,near.org";
   * const signerContractPublicKey = "secp256k1:37aFybhUHCxRdDkuCcB3yHzxqK7N8EQ745MujyAQohXSsYymVeHzhLxKvZ2qYeRHf3pGFiAsxqFJZjpF9gP2JV5u";
   * const address = deriveProductionAddress(signerId, path, signerContractPublicKey);
   * console.log(address); // 0x...
   */
  static async deriveProductionAddress(
    signerId: string,
    path: string,
    signerContractPublicKey: string
  ): Promise<string> {
    // const epsilon = KeyDerivation.deriveEpsilon(signerId, path);
    // const derivedKey = KeyDerivation.deriveKey(
    //   signerContractPublicKey,
    //   epsilon
    // );

    // const publicKeyNoPrefix = derivedKey.startsWith('04')
    //   ? derivedKey.substring(2)
    //   : derivedKey;
    // const hash = ethers.keccak256(Buffer.from(publicKeyNoPrefix, 'hex'));

    // return `0x${hash.substring(hash.length - 40)}`;

    return generateEthereumAddress(signerId, path, signerContractPublicKey);
  }

  /**
   * Orchestrates the transaction execution process by attaching necessary gas and nonce, signing, and then sending the transaction.
   * This method leverages the provided chain instance, transaction details, account credentials, and a specific derived path
   * to facilitate the execution of a transaction on the blockchain network.
   *
   * @param {Transaction} data - Contains the transaction details such as the recipient's address and the transaction value.
   * @param {Account} account - Holds the account credentials including the unique account ID.
   * @param {string} derivedPath - Specifies the derived path utilized for the transaction signing process.
   * @param {string} signerContractPublicKey - The public key associated with the account, used in address derivation.
   * @returns {Promise<void>} A promise that is fulfilled once the transaction has been successfully processed.
   */
  async handleTransaction(
    data: {to: string, value: string},
    account: Account,
    derivedPath: string,
    signerContractPublicKey: string
  ): Promise<ethers.TransactionResponse | undefined> {
    const from = await EVM.deriveProductionAddress(
      account?.accountId,
      derivedPath,
      signerContractPublicKey
    );

    const transaction = await this.attachGasAndNonce({
      from,
      to:    data.to,
      value: parseEther(data.value),
    });

    const transactionHash = EVM.prepareTransactionForSignature(transaction);

    const functionCall = transactions.functionCall(
      'sign',
      {
        payload: Array.from(ethers.getBytes(transactionHash)).slice().reverse(),
        path:    derivedPath,
      },
      new BN('300000000000000'),
      new BN(0)
    );

    const signed = await window.fastAuthController.signDelegateAction(
      {
        receiverId: 'multichain-testnet-2.testnet',
        actions:    [functionCall],
        signerId:   account.accountId
      }
    );

    const signature = await signMPC(
      signed,
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

        if (from.toLowerCase() === address.toLowerCase()) {
          console.log(`BE Address: ${address}`);

          return true;
        }

        return false;
      });

      if (v === undefined) {
        throw new Error('Failed to recover address from signature.');
      }

      const transactionResponse = await this.sendSignedTransaction({
        ...transaction,
        signature: ethers.Signature.from({ r, s, v })
      });

      return transactionResponse;
    }

    return undefined;
  }
}

export default EVM;
