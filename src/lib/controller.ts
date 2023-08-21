import { Account, Connection } from '@near-js/accounts';
import { createKey, getKeys } from '@near-js/biometric-ed25519';
import { KeyPair, KeyPairEd25519 } from '@near-js/crypto';
import { InMemoryKeyStore } from '@near-js/keystores';
import { baseEncode, serialize } from 'borsh';
import { initializeApp, getApps } from 'firebase/app';
import { Auth, User, getAuth } from 'firebase/auth';
import {
  getFirestore, Firestore, collection, addDoc, getDocs, query, doc, deleteDoc, CollectionReference
} from 'firebase/firestore';
import { sha256 } from 'js-sha256';
import UAParser from 'ua-parser-js';
import { actionCreators, encodeSignedDelegate } from '@near-js/transactions';
import { baseEncode } from 'borsh';

import firebaseParams from './firebaseParams';
import networkParams from './networkParams';
import { DeleteDevice, Device } from '../types/firebase';
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

  private oidcToken: string;

  private limitedAccessKey: KeyPair;

  constructor({ networkId }) {
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
    this.keyStore = new InMemoryKeyStore();

    // TODO: Upon retrieving the user's details, will need to use token to authenticate with firebase
    const firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseParams[networkId]);
    this.firebaseAuth = getAuth(firebaseApp);
    this.fireStore = getFirestore(firebaseApp);

    this.firebaseAuth.onIdTokenChanged(async (user: User) => {
      console.log('user', user);
      if (!user) {
        return;
      }
      this.userUid = user.uid;
      if (window?.fastAuthController) {
        window.fastAuthController.userUid = user.uid;
      }
      if (!this.oidcToken) {
        const token = await user.getIdToken();
        this.setOidcToken(token);
      }
    });

    const accountId = localStorage.getItem('near_account_id');
    if (accountId) {
      this.setAccountId(accountId);
    }

    const limitedAccessKey = localStorage.getItem('limitedAccessKey');
    if (limitedAccessKey) {
      this.setLimitedAccessKey(KeyPair.fromString(limitedAccessKey));
    }
    this.accountId = accountId;
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

  setLimitedAccessKey(keypair) {
    this.limitedAccessKey = keypair;
  }

  setAccountId(accountId) {
    this.accountId = accountId;
  }

  async isSignedIn() {
    // return !!(await this.getKey());
    return !!this.limitedAccessKey;
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
    const recoveryKey = await this.getUserCredential();

    const accessKeysWithoutRecoveryKey = accessKeys.filter((key) => key.public_key !== recoveryKey);

    const q = query(collection(this.fireStore, `/users/${this.userUid}/devices`) as CollectionReference<Device>);
    const querySnapshot = await getDocs(q);
    const collections = [];

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
    return accessKeysWithoutRecoveryKey.reduce((list, key) => {
      const exist = list.find((c) => c.publicKeys.includes(key.public_key));
      if (exist) {
        return list;
      }

      // If there are any keys that are absent from firestore, show them as unknown
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
          // await Promise.all(publicKeys.map((key) => account.deleteKey(key)));
          // TODO: implement /sign endpoint to pass deletekey action
        } catch (err) {
          console.log('Fail to delete keys', err);
          throw new Error(err);
        }
      }
    }));
  }

  private hashToken = () => {
    const tokenHash = sha256.create();
    tokenHash.update(this.oidcToken);
    return tokenHash.array();
  };

  private async constructSignObj(salt, hashOidcToken) {
    const value = ({ salt });
    const saltSerialize = serialize(new Map([[Object, { kind: 'struct', fields: [['salt', 'u32']] }]]), value);

    const keyPair = this.limitedAccessKey;
    const tokenHash = sha256.create();
    tokenHash.update(this.oidcToken);

    const token = hashOidcToken ? this.hashToken() : this.oidcToken;
    const tokenType = hashOidcToken ? [32] : 'string';
    const tokenSerialize = serialize(new Map([[Object, { kind: 'struct', fields: [['oidc_token', tokenType]] }]]), ({ oidc_token: token }));
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
    const CLAIM_SALT = 3177899144 + 0;
    const signObj = await this.constructSignObj(CLAIM_SALT, true);
    const headers = new Headers();
    headers.append('Content-Type', 'application/json');

    const data = {
      oidc_token_hash: sha256(this.oidcToken),
      frp_signature: Buffer.from(signObj.signature).toString('hex'),
      frp_public_key: this.limitedAccessKey.getPublicKey().toString(),
    };

    // TODO: replace with proper node later
    return fetch(`${network.fastAuth.mpcRecoveryUrl}/claim_oidc`, {
      method: 'POST',
      mode: 'cors' as const,
      body: JSON.stringify(data),
      headers,
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error('Unable to claim OIDC token');
      }
      const res = await response.json();
      localStorage.setItem(`mpc_signature: ${this.limitedAccessKey.getPublicKey().toString()}`, res.mpc_signature);
      return res.mpc_signature;
    }).catch((err) => {
      console.log(err);
      throw new Error('Unable to claim OIDC token');
    });
  }

  async getUserCredential() {
    const GET_USER_SALT = 3177899144 + 2;
    const signObj = await this.constructSignObj(GET_USER_SALT, false);
    const headers = new Headers();
    headers.append('Content-Type', 'application/json');

    const data = {
      oidc_token: this.oidcToken,
      frp_signature: Buffer.from(signObj.signature).toString('hex'),
      frp_public_key: this.limitedAccessKey.getPublicKey().toString(),
    };

    return fetch(`${network.fastAuth.mpcRecoveryUrl}/user_credentials`, {
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
      return res.recovery_pk;
    }).catch((err) => {
      console.log(err);
      throw new Error('Unable to get user credential');
    });
  }

  async createAccount({
    fak,
    lak,
    contract_id,
    methodNames,
  }) {
    // First, claim the oidc token
    await this.claimOidcToken();

    // construct the sign obj
    const currentKeyPair = this.limitedAccessKey;
    const CLAIM_SALT = 3177899144 + 2;
    const signObj = await this.constructSignObj(CLAIM_SALT, false);
    const publicKey = currentKeyPair.getPublicKey().toString();
    const data = {
      near_account_id: this.accountId,
      create_account_options: {
        full_access_keys:    [fak],
        limited_access_keys: [
          {
            public_key:   lak,
            receiver_id:  contract_id,
            allowance:    '250000000000000',
            method_names: (methodNames && methodNames.split(',')) || '',
          },
        ],
      },
      oidc_token: this.oidcToken,
      user_credentials_frp_signature: Buffer.from(signObj.signature).toString('hex'),
      frp_public_key: publicKey,
    };

    const headers = new Headers();
    headers.append('Content-Type', 'application/json');

    const options = {
      method: 'POST',
      mode:   'cors' as const,
      body:   JSON.stringify(data),
      headers,
    };
    return fetch(`${network.fastAuth.mpcRecoveryUrl}/new_account`, options)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Unable to create user');
        }
        const res = await response.json();
        // On success, register device
        const publicKeyFromCreateAccount = res?.create_account_options?.full_access_keys?.[0];
        await this.addCollection([publicKeyFromCreateAccount, lak]);
        localStorage.setItem('near_account_id', res.near_account_id);
        return res;
      }).catch((err) => {
        // TODO: implement redirect logic here to handle too many key error
        console.log(err);
        throw new Error('Unable to create user');
      });
  }
}

export default FastAuthController;
