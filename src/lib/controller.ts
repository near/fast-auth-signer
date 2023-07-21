import { Account, Connection } from '@near-js/accounts';
import { createKey, getKeys } from '@near-js/biometric-ed25519';
import { KeyPairEd25519 } from '@near-js/crypto';
import { InMemoryKeyStore } from '@near-js/keystores';
import { baseEncode } from 'borsh';
import { initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import {
  getFirestore, Firestore, collection, addDoc, getDocs, query, where, writeBatch, doc
} from 'firebase/firestore';
import UAParser from 'ua-parser-js';

import firebaseParams from './firebaseParams';
import networkParams from './networkParams';

class FastAuthController {
  private accountId: string;

  private networkId: string;

  private keyStore: InMemoryKeyStore;

  private connection: Connection;

  private firebaseAuth: Auth;

  private fireStore: Firestore;

  private userUid: string; // should be filled when user is created/signedin through firebase

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

    const firebaseApp = initializeApp(firebaseParams[networkId]);
    this.firebaseAuth = getAuth(firebaseApp);
    this.fireStore = getFirestore(firebaseApp);
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

  setuserUid(uid: string) {
    this.userUid = uid;
  }

  async addCollection() {
    const parser = new UAParser();
    const device = parser.getDevice();
    const os = parser.getOS();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // TEST code, need to be remove when create account is ready
    this.setuserUid('lJE0oCyHhRedt5KGF3oMemIuo433');

    return addDoc(collection(this.fireStore, 'devices'), {
      country:    timezone,
      device:     `${device.vendor} ${device.model}`,
      os:         `${os.name} ${os.version}`,
      // TODO: replace test public keys with real ones when ready
      publicKeys: [
        'FAK',
        'LAK'
      ],
      uid: this.userUid,
    });
  }

  async listCollections() {
    // TEST code, need to be remove when create account is ready
    this.setuserUid('lJE0oCyHhRedt5KGF3oMemIuo433');

    const q = query(collection(this.fireStore, 'devices'), where('uid', '==', this.userUid));
    const querySnapshot = await getDocs(q);
    const collections = [];

    querySnapshot.forEach((document) => collections.push({
      ...document.data(),
      id: document.id,
    }));
    return collections;
  }

  // TODO: need to add logic to delete associated keys to object
  async deleteCollections(docIds: string[]) {
    const batch = writeBatch(this.fireStore);
    docIds.forEach((docId) => {
      const ref = doc(this.fireStore, 'devices', docId);
      batch.delete(ref);
    });
    return batch.commit().then(() => {
      console.log('Batch delete success');
    }).catch((err) => {
      console.log('Batch delete error', err);
    });
  }
}

export default FastAuthController;
