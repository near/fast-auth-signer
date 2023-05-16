import { Account, Connection } from '@near-js/accounts';
import { createKey, getKeys } from '@near-js/biometric-ed25519';
import { KeyPairEd25519 } from '@near-js/crypto';
import { InMemoryKeyStore } from '@near-js/keystores';
import { baseEncode } from 'borsh';

import networkParams from './networkParams';

class FastAuthController {
  private accountId: string;

  private networkId: string;

  private keyStore: InMemoryKeyStore;

  private connection: Connection;

  constructor({ accountId, networkId }) {
    const config = networkParams[networkId];
    if (!config) {
      throw new Error(`Invalid networkId ${networkId}`);
    }

    this.connection = Connection.fromConfig({
      networkId,
      provider: { type: 'JsonRpcProvider', args: { url: config.nodeUrl, headers: config.headers } },
      signer:   { type: 'InMemorySigner', keyStore: this.keyStore },
    });

    this.networkId = networkId;
    this.accountId = accountId;

    this.keyStore = new InMemoryKeyStore();
  }

  async createBiometricKey() {
    const keyPair = await createKey(this.accountId);
    await this.setKey(keyPair);

    return keyPair;
  }

  async getCorrectAccessKey(accountId, firstKeyPair, secondKeyPair) {
    const account = new Account(this.connection, this.accountId);

    const accessKeys = await account.getAccessKeys();

    const firstPublicKeyB58 = `ed25519:${baseEncode((firstKeyPair.getPublicKey().data))}`;
    const secondPublicKeyB58 = `ed25519:${baseEncode((secondKeyPair.getPublicKey().data))}`;

    const accessKey = accessKeys.find((key) => key.public_key === firstPublicKeyB58 || secondPublicKeyB58);
    if (!accessKey) {
      throw new Error('No access key found');
    } else if (accessKey.public_key === firstPublicKeyB58) {
      return firstKeyPair;
    } else {
      return secondKeyPair;
    }
  }

  private async getBiometricKey() {
    const [firstKeyPair, secondKeyPair] = await getKeys(this.accountId);
    const privKeyStr = await this.getCorrectAccessKey(this.accountId, firstKeyPair, secondKeyPair);

    return new KeyPairEd25519(privKeyStr.split(':')[1]);
  }

  async getKey() {
    return this.keyStore.getKey(this.networkId, this.accountId);
  }

  async setKey(keyPair) {
    return this.keyStore.setKey(this.networkId, this.accountId, keyPair);
  }

  async isSignedIn() {
    return !!(await this.getKey());
  }

  assertValidSigner(signerId) {
    if (signerId && signerId !== this.accountId) {
      throw new Error(`Cannot sign transactions for ${signerId} while signed in as ${this.accountId}`);
    }
  }

  async getPublicKey() {
    let keyPair = await this.getKey();

    if (!keyPair) {
      const biometricKeyPair = await this.getBiometricKey();
      await this.setKey(biometricKeyPair);

      keyPair = biometricKeyPair;
    }

    return keyPair.getPublicKey().toString();
  }

  async getAccounts() {
    if (this.accountId) {
      return [this.accountId];
    }

    return [];
  }

  async signDelegateAction({ receiverId, actions, signerId }) {
    this.assertValidSigner(signerId);

    const account = new Account(this.connection, this.accountId);
    return account.signedDelegate({
      actions,
      blockHeightTtl: 60,
      receiverId,
    });
  }

  async signTransaction(params) {
    return this.signDelegateAction(params);
  }
}

export default FastAuthController;
