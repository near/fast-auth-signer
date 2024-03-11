import axios from 'axios';
import * as bitcoin from 'bitcoinjs-lib';
import coinselect from 'coinselect';
import { Account } from 'near-api-js';

import { generateBTCAddress } from '../kdf/kdf-osman';
import { getRootPublicKey, sign } from '../signature';

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
    prevout: any; // Keeping it as any to simplify, replace with actual type if known
    is_pegin: boolean;
    issuance: any; // Keeping it as any to simplify, replace with actual type if known
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
    pegout: any; // Keeping it as any to simplify, replace with actual type if known
  }>;
  status: {
    confirmed: boolean;
    block_height: number | null;
    block_hash: string | null;
    block_time: number | null;
  };
};

type UTXO = {
  txid: string;
  vout: number;
  value: number
  script: string
}

type NetworkType = 'bitcoin' | 'testnet'

export class Bitcoin {
  private network: bitcoin.networks.Network;

  private providerUrl: string;

  private relayerUrl: string;

  constructor(config: {
    networkType: NetworkType;
    providerUrl: string;
    relayerUrl: string
  }) {
    this.network =      config.networkType === 'testnet'
      ? bitcoin.networks.testnet
      : bitcoin.networks.bitcoin;
    this.providerUrl = config.providerUrl;
    this.relayerUrl = config.relayerUrl;
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
   * UTXOs are important for understanding the available balance of a Bitcoin address
   * and are necessary for constructing new transactions.
   *
   * @param {string} address - The Bitcoin address for which to fetch the UTXOs.
   * @returns {Promise<UTXO[]>} A promise that resolves to an array of UTXOs.
   * Each UTXO is represented as an object containing the transaction ID (`txid`), the output index within that transaction (`vout`),
   * and the value of the output in satoshis (`value`).
   */
  async fetchUTXOs(
    address: string
  ): Promise<UTXO[]> {
    try {
      const response = await axios.get(
        `${this.providerUrl}address/${address}/utxo`
      );
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
    const response = await axios.get(`${this.providerUrl}fee-estimates`);
    if (response.data && response.data[confirmationTarget]) {
      return response.data[confirmationTarget];
    }
    throw new Error(
      `Fee rate data for ${confirmationTarget} blocks confirmation target is missing in the response`
    );
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
   * Derives a spoofed Bitcoin address and public key for testing purposes using a Multi-Party Computation (MPC) approach.
   * This method simulates the derivation of a Bitcoin address and public key from a given predecessor and path,
   * using a spoofed key generation process. It is intended for use in test environments where actual Bitcoin transactions
   * are not feasible.
   *
   * @param {string} signerId - A string representing the initial input or seed for the spoofed key generation.
   * @param {string} path - A derivation path that influences the final generated spoofed key.
   * @param {string} contractRootPublicKey - The root public key from which new keys are derived based on the specified path.
   * @returns {{ address: string; publicKey: Buffer }} An object containing the derived spoofed Bitcoin address and public key.
   */
  static async deriveAddress(
    signerId: string,
    path: string,
    network: bitcoin.networks.Network,
    account: Account
  ): Promise<{ address: string; publicKey: Buffer; }> {
    const contractRootPublicKey = await getRootPublicKey('multichain-testnet-2.testnet', account);

    const derivedKey = await generateBTCAddress(
      signerId,
      path,
      contractRootPublicKey,
    );

    const publicKeyBuffer = Buffer.from(derivedKey, 'hex');

    const { address } = bitcoin.payments.p2pkh({
      pubkey:  publicKeyBuffer,
      network,
    });

    return { address, publicKey: publicKeyBuffer };
  }

  /**
   * Joins the r and s components of a signature into a single Buffer.
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
   * @returns {Promise<Object>} A promise that resolves to an object containing the selected UTXOs, the total value, the fee (satoshis) and the change.
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
    const utxos = await this.fetchUTXOs(from);
    const feeRate = await this.fetchFeeRate(confirmationTarget);

    const ret = coinselect(utxos, targets, feeRate + 1);

    if (!ret.inputs || !ret.outputs) {
      throw new Error('Invalid transaction');
    }

    return ret;
  }

  /**
   * Handles the process of creating and broadcasting a Bitcoin transaction.
   * This function takes the recipient's address, the amount to send, the account details,
   * and the derived path for the account to create a transaction. It then signs the transaction
   * using the account's private key and broadcasts it to the Bitcoin network.
   *
   * @param {Object} data - The transaction data.
   * @param {string} data.to - The recipient's Bitcoin address.
   * @param {number} data.value - The amount of Bitcoin to send (in BTC).
   * @param {Account} account - The account object containing the user's account information.
   * @param {string} keyPath - The key derivation path for the account.
   */
  async handleTransaction(
    data: {
      to: string;
      value: number;
    },
    account: Account,
    keyPath: string,
  ) {
    const satoshis = Bitcoin.toSatoshi(data.value);
    const { address, publicKey } = await Bitcoin.deriveAddress(
      account.accountId,
      keyPath,
      this.network,
      account,
    );

    const { inputs, outputs } = await this.getFeeProperties(address, [{
      address: data.to,
      value:   satoshis
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
          keyPath,
          account,
          this.relayerUrl
        );

        if (!signature) {
          throw new Error('Failed to sign transaction');
        }

        return Buffer.from(Bitcoin.joinSignature(signature));
      },
    };

    await Promise.all(
      inputs.map(async (_, index) => {
        await psbt.signInputAsync(index, mpcKeyPair);
      })
    );

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
