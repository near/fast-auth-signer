import { Account, Connection } from '@near-js/accounts';
import { createKey, getKeys } from '@near-js/biometric-ed25519';
import { KeyPairEd25519, KeyPair } from '@near-js/crypto';
import { InMemoryKeyStore } from '@near-js/keystores';
import { baseEncode, serialize } from 'borsh';
import { initializeApp } from 'firebase/app';
import { Auth, User, getAuth } from 'firebase/auth';
import {
  getFirestore, Firestore, collection, addDoc, getDocs, query, doc, deleteDoc, CollectionReference
} from 'firebase/firestore';
import { sha256 } from 'js-sha256';
import UAParser from 'ua-parser-js';

import firebaseParams from './firebaseParams';
import networkParams from './networkParams';
import { DeleteDevice, Device } from '../types/firebase';

class FastAuthController {
  private accountId: string;

  private networkId: string;

  private keyStore: InMemoryKeyStore;

  private connection: Connection;

  private firebaseAuth: Auth;

  private fireStore: Firestore;

  public userUid: string;

  private oidcToken: string;

  constructor({ accountId, networkId, oidcToken, fullAccessKey }) {
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

    // TODO: Upon retrieving the user's details, will need to use token to authenticate with firebase
    const firebaseApp = initializeApp(firebaseParams[networkId]);
    this.firebaseAuth = getAuth(firebaseApp);
    this.fireStore = getFirestore(firebaseApp);

    this.setOidcToken(oidcToken);

    this.firebaseAuth.onIdTokenChanged((user: User) => {
      if (!user) {
        return;
      }
      this.userUid = user.uid;
      if (window?.fastAuthController) {
        window.fastAuthController.userUid = user.uid;
      }
    });

    // TODO: replace this code when create account is ready
    console.log('fullAccessKey', fullAccessKey);
    this.setKey(KeyPair.fromString(fullAccessKey));
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

  setOidcToken(token: string) {
    this.oidcToken = token;
  }

  async addCollection(keys: string[]) {
    const parser = new UAParser();
    const device = parser.getDevice();
    const os = parser.getOS();

    return addDoc(collection(this.fireStore, `/users/${this.userUid}/devices`), {
      device:     `${device.vendor} ${device.model}`,
      os:         `${os.name} ${os.version}`,
      publicKeys: keys,
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
    const q = query(collection(this.fireStore, `/users/${this.userUid}/devices`) as CollectionReference<Device>);
    const querySnapshot = await getDocs(q);
    const collections = [];

    // use internal loop function from QuerySnapshot
    querySnapshot.forEach((document) => {
      const data = document.data();
      collections.push({
        ...data,
        firebaseId: document.id,
        id: data.publicKeys[0],
        label: `${data.device} - ${data.os}`,
      });
    });

    // TODO: from the list, exclude record that has same key from recovery service
    return accessKeys.reduce((list, key) => {
      const exist = list.find((c) => c.publicKeys.includes(key.public_key));
      if (exist) {
        return list;
      }
      return [
        ...list,
        {
          id: key.public_key,
          firebaseId: null,
          label: 'Unknown Device',
          publicKeys: [key.public_key],
        }
      ];
    }, collections);
  }

  // TODO: need to add logic to delete associated keys to object
  async deleteCollections(list: DeleteDevice[]) {
    const account = new Account(this.connection, this.accountId);

    return Promise.all(list.map(async ({ firebaseId, publicKeys }) => {
      if (firebaseId) {
        try {
          await deleteDoc(doc(this.fireStore, `/users/${this.userUid}/devices`, firebaseId));
        } catch (err) {
          console.log('Fail to delete firestore collection', err);
          throw new Error(err);
        }
      }
      if (publicKeys.length) {
        try {
          await Promise.all(publicKeys.map((key) => account.deleteKey(key)));
        } catch (err) {
          console.log('Fail to delete keys', err);
          throw new Error(err);
        }
      }
    }));
  }

  private async constructSignObj(salt) {
    const value = ({ salt });
    const saltSerialize = serialize(new Map([[Object, { kind: 'struct', fields: [['salt', 'u32']] }]]), value);

    const keyPair = await this.getKey();
    const tokenHash = sha256.create();
    tokenHash.update(this.oidcToken);
    const tokenSerialize = serialize(new Map([[Object, { kind: 'struct', fields: [['oidc_token', [32]]] }]]), ({ oidc_token: tokenHash.array() }));
    const publicKeySerialize = serialize(new Map([[Object, { kind: 'struct', fields: [['public_key', [32]]] }]]), ({ public_key: Array.from(keyPair.getPublicKey().data) }));

    const mergeArray = new Uint8Array(saltSerialize.length + tokenSerialize.length + publicKeySerialize.length + 1);
    mergeArray.set(saltSerialize);
    mergeArray.set(tokenSerialize, saltSerialize.length);
    mergeArray.set([0], saltSerialize.length + tokenSerialize.length);
    mergeArray.set(publicKeySerialize, saltSerialize.length + tokenSerialize.length + 1);

    const hash = sha256.create();
    hash.update(mergeArray);

    return keyPair.sign(new Uint8Array(hash.arrayBuffer()));
  }

  // This call need to be called after user account is created to claim that given oidc token belong to the user
  // https://github.com/near/mpc-recovery#claim-oidc-id-token-ownership
  async claimOidcToken() {
    const currentKeyPair = await this.getKey();
    const CLAIM_SALT = 3177899144 + 0;
    const signObj = await this.constructSignObj(CLAIM_SALT);
    const headers = new Headers();
    headers.append('Content-Type', 'application/json');

    const data = {
      oidc_token_hash: sha256(this.oidcToken),
      frp_signature: Buffer.from(signObj.signature).toString('hex'),
      frp_public_key: currentKeyPair.getPublicKey().toString(),
    };

    // TODO: replace with proper node later
    return fetch('https://mpc-recovery-leader-dev-7tk2cmmtcq-ue.a.run.app/claim_oidc', {
      method: 'POST',
      mode: 'cors' as const,
      body: JSON.stringify(data),
      headers,
    }).then(async (response) => {
      if (!response.ok) {
        console.log('response', response);
        throw new Error('Unable to claim OIDC token');
      }
      const res = await response.json();
      localStorage.setItem('mpc_signature', res.mpc_signature);
      return res.mpc_signature;
    }).catch((err) => {
      console.log(err);
      throw new Error('Unable to claim OIDC token');
    });
  }

  async getUserCredential() {
    const currentKeyPair = await this.getKey();
    const GET_USER_SALT = 3177899144 + 2;
    const signObj = await this.constructSignObj(GET_USER_SALT);
    const headers = new Headers();
    headers.append('Content-Type', 'application/json');

    const data = {
      oidc_token: this.oidcToken,
      frp_signature: Buffer.from(signObj.signature).toString('hex'),
      frp_public_key: currentKeyPair.getPublicKey().toString(),
    };

    // TODO: replace with proper node later
    return fetch('https://mpc-recovery-leader-dev-7tk2cmmtcq-ue.a.run.app/user_credentials', {
      method: 'POST',
      mode: 'cors' as const,
      body: JSON.stringify(data),
      headers,
    }).then(async (response) => {
      if (!response.ok) {
        console.log('response', response);
        throw new Error('Unable to get user credential');
      }
      const res = await response.json();
      console.log('res', res);
      // localStorage.setItem('mpc_signature', res.Ok.mpc_signature);
      return res.recovery_pk;
    }).catch((err) => {
      console.log(err);
      throw new Error('Unable to get user credential');
    });
  }
}

export default FastAuthController;
