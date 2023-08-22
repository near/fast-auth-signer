import { Account, Connection } from '@near-js/accounts';
import { createKey, getKeys } from '@near-js/biometric-ed25519';
import { KeyPairEd25519, PublicKey } from '@near-js/crypto';
import { InMemoryKeyStore } from '@near-js/keystores';
import { actionCreators, encodeSignedDelegate } from '@near-js/transactions';
import { baseEncode } from 'borsh';
import { initializeApp } from 'firebase/app';
import { Auth, User, getAuth } from 'firebase/auth';
import {
  getFirestore, Firestore, collection, addDoc, getDocs, query, writeBatch, doc
} from 'firebase/firestore';
import UAParser from 'ua-parser-js';

import firebaseParams from './firebaseParams';
import networkParams from './networkParams';
import { network } from '../utils/config';

const { addKey, functionCallAccessKey } = actionCreators;
class FastAuthController {
  private accountId: string;

  private networkId: string;

  private keyStore: InMemoryKeyStore;

  private connection: Connection;

  private firebaseAuth: Auth;

  private fireStore: Firestore;

  public userUid: string;

  constructor({ accountId, networkId }) {
    const config = networkParams[networkId];
    if (!config) {
      throw new Error(`Invalid networkId ${networkId}`);
    }

    this.keyStore = new InMemoryKeyStore();

    this.connection = Connection.fromConfig({
      networkId,
      provider: { type: 'JsonRpcProvider', args: { url: config.nodeUrl, headers: config.headers } },
      signer:   { type: 'InMemorySigner', keyStore: this.keyStore },
    });

    this.networkId = networkId;
    this.accountId = accountId;

    // TODO: Upon retrieving the user's details, will need to use token to authenticate with firebase
    const firebaseApp = initializeApp(firebaseParams[networkId]);
    this.firebaseAuth = getAuth(firebaseApp);
    this.fireStore = getFirestore(firebaseApp);

    this.firebaseAuth.onIdTokenChanged((user: User) => {
      this.userUid = user.uid;
      window.fastAuthController.userUid = user.uid;
    });
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

  getAccountId() {
    return this.accountId;
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

  async signAndSendDelegateAction({ receiverId, actions }) {
    const signedDelegate = await this.signDelegateAction({ receiverId, actions, signerId: this.accountId });

    return fetch(network.relayerUrl, {
      method:  'POST',
      mode:    'cors',
      body:    JSON.stringify(Array.from(encodeSignedDelegate(signedDelegate))),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    });
  }

  async signAndSendAddKey({
    contractId, methodNames, allowance, publicKey
  }) {
    return this.signAndSendDelegateAction({
      receiverId: this.accountId,
      actions:    [addKey(PublicKey.from(publicKey), functionCallAccessKey(contractId, methodNames || [], allowance))]
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

    return addDoc(collection(this.fireStore, `/users/${this.userUid}/devices`), {
      device:     `${device.vendor} ${device.model}`,
      os:         `${os.name} ${os.version}`,
      // TODO: replace test public keys with real ones when ready
      publicKeys: [
        'FAK',
        'LAK'
      ],
      uid: this.userUid,
    }).catch((err) => {
      console.log('fail to add collection, ', err);
    });
  }

  async listCollections() {
    const account = new Account(this.connection, this.accountId);
    const accessKeys = await account.getAccessKeys();
    console.log('accessKeys', accessKeys);

    // TODO: get public key from recovery service

    const q = query(collection(this.fireStore, `/users/${this.userUid}/devices`));
    const querySnapshot = await getDocs(q);
    const collections = [];

    querySnapshot.forEach((document) => collections.push({
      ...document.data(),
      id: document.id,
    }));

    // TODO: from the list, exclude record that has same public key from recovery service
    return collections;
  }

  // TODO: need to add logic to delete associated keys to object
  async deleteCollections(docIds: string[]) {
    const batch = writeBatch(this.fireStore);
    docIds.forEach((docId) => {
      const ref = doc(this.fireStore, `/users/${this.userUid}/devices`, docId);
      batch.delete(ref);
    });
    return batch.commit().then(() => {
      console.log('Batch delete success');
    }).catch((err) => {
      console.log('Batch delete error', err);
      throw new Error(err);
    });
  }
}

export default FastAuthController;
