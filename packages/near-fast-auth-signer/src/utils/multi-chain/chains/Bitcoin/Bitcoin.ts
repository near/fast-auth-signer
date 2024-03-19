import axios from 'axios';
import * as bitcoin from 'bitcoinjs-lib';

import { BTCTransaction, UTXO } from './types';
import { sign } from '../../signature';
import {
  fetchBTCFeeProperties, fetchBTCFeeRate, fetchBTCUTXOs, fetchDerivedBTCAddressAndPublicKey
} from '../../utils';
import { ChainSignatureContracts, NearAuthentication, NearNetworkIds } from '../types';

type Transaction = {
  txid: string;
  version: number;
  locktime: number;
  size: number;
  weight: number;
  fee: number;
  vin: Array<{
    txid: string;
    vout: number;
    is_coinbase: boolean;
    scriptsig: string;
    scriptsig_asm: string;
    inner_redeemscript_asm: string;
    inner_witnessscript_asm: string;
    sequence: number;
    witness: string[];
    prevout: any;
    is_pegin: boolean;
    issuance: any;
  }>;
  vout: Array<{
    scriptpubkey: string;
    scriptpubkey_asm: string;
    scriptpubkey_type: string;
    scriptpubkey_address: string;
    value: number;
    valuecommitment: string;
    asset: string;
    assetcommitment: string;
    pegout: any;
  }>;
  status: {
    confirmed: boolean;
    block_height: number | null;
    block_hash: string | null;
    block_time: number | null;
  };
};

type NetworkType = 'bitcoin' | 'testnet'

export class Bitcoin {
  private network: bitcoin.networks.Network;

  private providerUrl: string;

  private relayerUrl?: string;

  private contract: ChainSignatureContracts;

  constructor(config: {
    networkType: NetworkType;
    providerUrl: string;
    relayerUrl?: string,
    contract: ChainSignatureContracts
  }) {
    this.network =      config.networkType === 'testnet'
      ? bitcoin.networks.testnet
      : bitcoin.networks.bitcoin;
    this.providerUrl = config.providerUrl;
    this.relayerUrl = config.relayerUrl;
    this.contract = config.contract;
  }

  /**
   * Converts a value from satoshis to bitcoins.
   *
   * @param {number} satoshis - The amount in satoshis to convert.
   * @returns {number} The equivalent amount in bitcoins.
   */
  static toBTC(satoshis: number): number {
    return satoshis / 100000000;
  }

  /**
   * Converts a value from bitcoins to satoshis.
   *
   * @param {number} btc - The amount in bitcoins to convert.
   * @returns {number} The equivalent amount in satoshis.
   */
  static toSatoshi(btc: number): number {
    return btc * 100000000;
  }

  /**
   * Fetches the balance for a given Bitcoin address.
   * This function retrieves all unspent transaction outputs (UTXOs) for the address,
   * sums their values to calculate the total balance, and returns it as a string.
   *
   * @param {string} address - The Bitcoin address for which to fetch the balance.
   * @returns {Promise<string>} A promise that resolves to the balance of the address as a string.
   */
  async fetchBalance(address: string): Promise<string> {
    const utxos = await this.fetchUTXOs(address);
    return Bitcoin.toBTC(
      utxos.reduce((acc, utxo) => acc + utxo.value, 0)
    ).toString();
  }

  /**
   * Fetches the Unspent Transaction Outputs (UTXOs) for a given Bitcoin address.
   *
   * @param {string} address - The Bitcoin address for which to fetch the UTXOs.
   * @returns {Promise<UTXO[]>} A promise that resolves to an array of UTXOs.
   * Each UTXO is represented as an object containing the transaction ID (`txid`), the output index within that transaction (`vout`),
   * the value of the output in satoshis (`value`) and the locking script (`script`).
   */
  async fetchUTXOs(
    address: string
  ): Promise<UTXO[]> {
    return fetchBTCUTXOs(this.providerUrl, address);
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
  async fetchFeeRate(confirmationTarget = 6): Promise<number> {
    return fetchBTCFeeRate(this.providerUrl, confirmationTarget);
  }

  /**
   * Fetches a Bitcoin transaction by its ID and constructs a transaction object.
   * This function retrieves the transaction details from the blockchain using the RPC endpoint,
   * then parses the input and output data to construct a `bitcoin.Transaction` object.
   *
   * @param {string} transactionId - The ID of the transaction to fetch.
   * @returns {Promise<bitcoin.Transaction>} A promise that resolves to a `bitcoin.Transaction` object representing the fetched transaction.
   */
  async fetchTransaction(transactionId: string): Promise<bitcoin.Transaction> {
    const { data } = await axios.get<Transaction>(
      `${this.providerUrl}tx/${transactionId}`
    );
    const tx = new bitcoin.Transaction();

    tx.version = data.version;
    tx.locktime = data.locktime;

    data.vin.forEach((vin) => {
      const txHash = Buffer.from(vin.txid, 'hex').reverse();
      const { vout } = vin;
      const { sequence } = vin;
      const scriptSig = vin.scriptsig
        ? Buffer.from(vin.scriptsig, 'hex')
        : undefined;
      tx.addInput(txHash, vout, sequence, scriptSig);
    });

    data.vout.forEach((vout) => {
      const { value } = vout;
      const scriptPubKey = Buffer.from(vout.scriptpubkey, 'hex');
      tx.addOutput(scriptPubKey, value);
    });

    data.vin.forEach((vin, index) => {
      if (vin.witness && vin.witness.length > 0) {
        const witness = vin.witness.map((w) => Buffer.from(w, 'hex'));
        tx.setWitness(index, witness);
      }
    });

    return tx;
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
   * @returns {Promise<{ address: string; publicKey: Buffer }>} An object containing the derived Bitcoin address and its corresponding public key buffer.
   */
  async deriveAddress(
    signerId: string,
    path: string,
    nearNetworkId: NearNetworkIds,
  ): Promise<{ address: string; publicKey: Buffer; }> {
    return fetchDerivedBTCAddressAndPublicKey(
      signerId,
      path,
      this.network,
      nearNetworkId,
      this.contract
    );
  }

  /**
   * This function takes an object containing the r and s components of a signature,
   * pads them to ensure they are each 64 characters long, concatenates them,
   * and then converts the concatenated string into a Buffer. This Buffer represents
   * the full signature in hexadecimal format. If the resulting Buffer is not exactly
   * 64 bytes long, an error is thrown.
   *
   * @param {Object} signature - An object containing the r and s components of a signature.
   * @param {string} signature.r - The r component of the signature.
   * @param {string} signature.s - The s component of the signature.
   * @returns {Buffer} A Buffer representing the concatenated r and s components of the signature.
   * @throws {Error} Throws an error if the resulting Buffer is not exactly 64 bytes long.
   */
  static joinSignature(signature: { r: string; s: string }): Buffer {
    const r = signature.r.padStart(64, '0');
    const s = signature.s.padStart(64, '0');

    const rawSignature = Buffer.from(r + s, 'hex');

    if (rawSignature.length !== 64) {
      throw new Error('Invalid signature length.');
    }

    return rawSignature;
  }

  /**
   * Sends a signed transaction to the Bitcoin network.
   * This function takes the hexadecimal representation of a signed transaction
   * and broadcasts it to the network using a proxy URL to bypass CORS restrictions.
   * It logs the transaction ID if the broadcast is successful, or an error message otherwise.
   *
   * @param {string} txHex - The hexadecimal string of the signed transaction.
   * @param {Object} [options] - Optional parameters.
   * @param {boolean} [options.proxy=false] - Whether to use a proxy URL for the transaction broadcast.
   * @returns {Promise<string>} A promise that resolves with the txid once the transaction is successfully broadcast
   */
  async sendTransaction(
    txHex: string,
    options?: { proxy?: boolean }
  ): Promise<string | undefined> {
    try {
      const proxyUrl = options?.proxy ? 'https://corsproxy.io/?' : '';
      const response = await axios.post(
        `${proxyUrl}${this.providerUrl}tx`,
        txHex
      );

      if (response.status === 200) {
        return response.data;
      }
      throw new Error(`Failed to broadcast transaction: ${response.data}`);
    } catch (error) {
      throw new Error(`Error broadcasting transaction: ${error}`);
    }
  }

  /**
   * Calculates the fee properties for a Bitcoin transaction.
   * This function fetches the Unspent Transaction Outputs (UTXOs) for the given address,
   * and the fee rate for the specified confirmation target. It then uses the `coinselect` algorithm
   * to select the UTXOs to be spent and calculates the fee required for the transaction.
   *
   * @param {string} from - The Bitcoin address from which the transaction is to be sent.
   * @param {Array<{address: string, value: number}>} targets - An array of target addresses and values (in satoshis) to send.
   * @param {number} [confirmationTarget=6] - The desired number of blocks in which the transaction should be confirmed.
   * @returns {Promise<{inputs: UTXO[], outputs: {address: string, value: number}[], fee: number}>} A promise that resolves to an object containing the inputs (selected UTXOs), outputs (destination addresses and values), and the transaction fee in satoshis.
   */
  async getFeeProperties(
    from: string,
    targets: {
      address: string;
      value: number;
    }[],
    confirmationTarget = 6
  ): Promise<{
    inputs: UTXO[],
    outputs: {address: string, value: number}[],
    fee: number,
  }> {
    return fetchBTCFeeProperties(this.providerUrl, from, targets, confirmationTarget);
  }

  /**
   * Handles the process of creating and broadcasting a Bitcoin transaction.
   * This function takes the recipient's address, the amount to send, the account details,
   * and the derived path for the account to create a transaction. It then signs the transaction
   * using the chain signature contract and broadcasts it to the Bitcoin network.
   *
   * @param {BTCTransaction} data - The transaction data.
   * @param {string} data.to - The recipient's Bitcoin address.
   * @param {string} data.value - The amount of Bitcoin to send (in BTC).
   * @param {NearAuthentication} nearAuthentication - The object containing the user's authentication information.
   * @param {string} path - The key derivation path for the account.
   */
  async handleTransaction(
    data: BTCTransaction,
    nearAuthentication: NearAuthentication,
    path: string,
  ) {
    const { address, publicKey } = await this.deriveAddress(
      nearAuthentication.accountId,
      path,
      nearAuthentication.networkId,
    );

    const { inputs, outputs } = data.inputs && data.outputs
      ? data
      : await this.getFeeProperties(address, [{
        address: data.to,
        value:   parseFloat(data.value)
      }]);

    const psbt = new bitcoin.Psbt({ network: this.network });

    await Promise.all(
      inputs.map(async (utxo) => {
        const transaction = await this.fetchTransaction(utxo.txid);
        let inputOptions;
        if (transaction.outs[utxo.vout].script.includes('0014')) {
          inputOptions = {
            hash:        utxo.txid,
            index:       utxo.vout,
            witnessUtxo: {
              script: transaction.outs[utxo.vout].script,
              value:  utxo.value,
            },
          };
        } else {
          inputOptions = {
            hash:           utxo.txid,
            index:          utxo.vout,
            nonWitnessUtxo: Buffer.from(transaction.toHex(), 'hex'),
          };
        }

        psbt.addInput(inputOptions);
      })
    );

    outputs.forEach((out) => {
      if (!out.address) {
        out.address = address;
      }

      psbt.addOutput({
        address: out.address,
        value:   out.value,
      });
    });

    const mpcKeyPair = {
      publicKey,
      sign: async (transactionHash: Buffer): Promise<Buffer> => {
        const signature = await sign(
          transactionHash,
          path,
          nearAuthentication,
          this.contract,
          this.relayerUrl
        );

        if (!signature) {
          throw new Error('Failed to sign transaction');
        }

        return Buffer.from(Bitcoin.joinSignature(signature));
      },
    };

    // TODO: it should be done in parallel,
    // but for now it's causing nonce issues on the signDelegate so we will run sequentially to avoid the issue for now
    for (let index = 0; index < inputs.length; index += 1) {
      // eslint-disable-next-line no-await-in-loop
      await psbt.signInputAsync(index, mpcKeyPair);
    }

    psbt.finalizeAllInputs();
    const txid = await this.sendTransaction(psbt.extractTransaction().toHex(), {
      proxy: true,
    });

    if (txid) {
      return txid;
    }
    return 'Error';
  }
}
