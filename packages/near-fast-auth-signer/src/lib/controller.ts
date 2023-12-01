import { Account, Connection } from '@near-js/accounts';
import { createKey, getKeys } from '@near-js/biometric-ed25519';
import {
  KeyPair, KeyPairEd25519, KeyType, PublicKey
} from '@near-js/crypto';
import { InMemoryKeyStore } from '@near-js/keystores';
import {
  SCHEMA, actionCreators, encodeSignedDelegate, buildDelegateAction, Signature, SignedDelegate
} from '@near-js/transactions';
import { captureException } from '@sentry/react';
import BN from 'bn.js';
import { baseEncode, serialize } from 'borsh';
import { sha256 } from 'js-sha256';
import { keyStores } from 'near-api-js';

import FirestoreController from './firestoreController';
import networkParams from './networkParams';
import { network } from '../utils/config';
import { firebaseAuth } from '../utils/firebase';
import { CLAIM, getSignRequestFrpSignature, getUserCredentialsFrpSignature } from '../utils/mpc-service';

const { addKey, functionCallAccessKey } = actionCreators;
class FastAuthController {
  private accountId: string;

  private networkId: string;

  private keyStore: InMemoryKeyStore;

  private localStore: keyStores.BrowserLocalStorageKeyStore;

  private connection: Connection;

  constructor({ accountId, networkId }) {
    const config = networkParams[networkId];
    if (!config) {
      throw new Error(`Invalid networkId ${networkId}`);
    }

    this.keyStore = new InMemoryKeyStore();
    this.localStore = new keyStores.BrowserLocalStorageKeyStore();

    this.connection = Connection.fromConfig({
      networkId,
      provider: { type: 'JsonRpcProvider', args: { url: config.nodeUrl, headers: config.headers } },
      signer:   { type: 'InMemorySigner', keyStore: this.keyStore },
    });

    this.networkId = networkId;
    this.accountId = accountId;
  }

  setAccountId = (accountId) => {
    this.accountId = accountId;
  };

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

  async getKey(accountId?: string) {
    return this.keyStore.getKey(this.networkId, accountId || this.accountId);
  }

  async setKey(keyPair) {
    return this.keyStore.setKey(this.networkId, this.accountId, keyPair);
  }

  async clearKey() {
    return this.keyStore.clear();
  }

  async clearUser() {
    await this.keyStore.clear();
    window.localStorage.removeItem('webauthn_username');
  }

  async isSignedIn() {
    return !!(await this.getKey());
  }

  async getLocalStoreKey(accountId) {
    return this.localStore.getKey(this.networkId, accountId);
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

  async fetchNonce({ accountId, publicKey }) {
    const rawAccessKey = await this.connection.provider.query({
      request_type: 'view_access_key',
      account_id:   accountId,
      public_key:   publicKey,
      finality:     'optimistic',
    });
    // @ts-ignore
    const nonce = rawAccessKey?.nonce;
    return new BN(nonce).add(new BN(1));
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
    try {
      // webAuthN supported browser
      const account = new Account(this.connection, this.accountId);
      return account.signedDelegate({
        actions,
        blockHeightTtl: 60,
        receiverId,
      });
    } catch {
      // fallback, non webAuthN supported browser
      // @ts-ignore
      const oidcToken =  firebaseAuth.currentUser.accessToken;
      const recoveryPK = await this.getUserCredential(oidcToken);
      // make sure to handle failure, (eg token expired) if fail, redirect to failure_url
      return this.createSignedDelegateWithRecoveryKey({
        oidcToken,
        accountId: this.accountId,
        actions,
        recoveryPK,
      }).catch((err) => {
        console.log(err);
        captureException(err);
        throw new Error('Unable to sign delegate action');
      });
    };
  }

  async signAndSendDelegateAction({ receiverId, actions }) {
    const signedDelegate = await this.signDelegateAction({ receiverId, actions, signerId: this.accountId });
    return fetch(network.relayerUrl, {
      method:  'POST',
      mode:    'cors',
      body:    JSON.stringify(Array.from(encodeSignedDelegate(signedDelegate))),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    }).catch((err) => {
      console.log('Unable to sign and send delegate action', err);
      captureException(err);
    });
  }

  async signAndSendAddKey({
    contractId, methodNames, allowance, publicKey,
  }) {
    return this.signAndSendDelegateAction({
      receiverId: this.accountId,
      actions:    [
        addKey(PublicKey.from(publicKey), functionCallAccessKey(contractId, methodNames || [], allowance))
      ]
    });
  }

  async signTransaction(params) {
    return this.signDelegateAction(params);
  }

  async getAllAccessKeysExceptRecoveryKey(odicToken: string): Promise<string[]> {
    const account = new Account(this.connection, this.accountId);
    const accessKeys = await account.getAccessKeys();
    const recoveryKey = await this.getUserCredential(odicToken);
    return accessKeys
      .filter((key) => key.public_key !== recoveryKey)
      .map(({ public_key }) => public_key);
  }

  // This call need to be called after new oidc token is generated
  async claimOidcToken(oidcToken: string): Promise<{ mpc_signature: string }> {
    let keypair = await this.getKey(`oidc_keypair_${oidcToken}`);
    const CLAIM_SALT = CLAIM + 0;
    if (!keypair) {
      keypair = KeyPair.fromRandom('ED25519');
      await this.keyStore.setKey(this.networkId, `oidc_keypair_${oidcToken}`, keypair);
      await this.localStore.setKey(this.networkId, `oidc_keypair_${oidcToken}`, keypair);
    }
    const signature = getUserCredentialsFrpSignature({
      salt:            CLAIM_SALT,
      oidcToken,
      shouldHashToken: true,
      keypair,
    });

    const data = {
      oidc_token_hash: sha256(oidcToken),
      frp_signature:   signature,
      frp_public_key:  keypair.getPublicKey().toString(),
    };

    // https://github.com/near/mpc-recovery#claim-oidc-id-token-ownership
    return fetch(`${network.fastAuth.mpcRecoveryUrl}/claim_oidc`, {
      method:  'POST',
      mode:    'cors' as const,
      body:    JSON.stringify(data),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error('Unable to claim OIDC token');
      }
      const res = await response.json();
      return res.mpc_signature;
    }).catch((err) => {
      console.log(err);
      throw new Error('Unable to claim OIDC token');
    });
  }

  async getUserCredential(oidcToken) {
    // @ts-ignore
    const GET_USER_SALT = CLAIM + 2;
    const keypair = await this.getKey(`oidc_keypair_${oidcToken}`) || await this.getLocalStoreKey(`oidc_keypair_${oidcToken}`);

    if (!keypair) {
      throw new Error('Unable to get oidc keypair');
    }

    const signature = getUserCredentialsFrpSignature({
      salt:            GET_USER_SALT,
      oidcToken,
      shouldHashToken: false,
      keypair,
    });

    const data = {
      oidc_token:     oidcToken,
      frp_signature:  signature,
      frp_public_key: keypair.getPublicKey().toString(),
    };

    // https://github.com/near/mpc-recovery#user-credentials
    return fetch(`${network.fastAuth.mpcRecoveryUrl}/user_credentials`, {
      method:  'POST',
      mode:    'cors' as const,
      body:    JSON.stringify(data),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error('Unable to get user credential');
      }
      const res = await response.json();
      return res.recovery_pk;
    }).catch((err) => {
      console.log(err);
      throw new Error('Unable to get user credential');
    });
  }

  async getBlock() {
    return this.connection.provider.block({ finality: 'final' });
  }

  async createSignedDelegateWithRecoveryKey({
    oidcToken,
    accountId,
    recoveryPK,
    actions,
  }) {
    const GET_SIGNATURE_SALT = CLAIM + 3;
    const GET_USER_SALT = CLAIM + 2;
    const localKey = await this.getKey(`oidc_keypair_${oidcToken}`) || await this.getLocalStoreKey(`oidc_keypair_${oidcToken}`);

    const { header } = await this.getBlock();
    const delegateAction = buildDelegateAction({
      actions,
      maxBlockHeight: new BN(header.height).add(new BN(60)),
      nonce:          await this.fetchNonce({ accountId, publicKey: recoveryPK }),
      publicKey:      PublicKey.from(recoveryPK),
      receiverId:     accountId,
      senderId:       accountId,
    });
    const encodedDelegateAction = Buffer.from(serialize(SCHEMA, delegateAction)).toString('base64');
    const userCredentialsFrpSignature = getUserCredentialsFrpSignature({
      salt:            GET_USER_SALT,
      oidcToken,
      shouldHashToken: false,
      keypair:         localKey,
    });
    const signRequestFrpSignature = getSignRequestFrpSignature({
      salt:    GET_SIGNATURE_SALT,
      oidcToken,
      keypair: localKey,
      delegateAction,
    });

    const payload = {
      delegate_action:                encodedDelegateAction,
      oidc_token:                     oidcToken,
      frp_signature:                  signRequestFrpSignature,
      user_credentials_frp_signature: userCredentialsFrpSignature,
      frp_public_key:                 localKey.getPublicKey().toString(),
    };

    // https://github.com/near/mpc-recovery#sign
    return fetch(`${network.fastAuth.mpcRecoveryUrl}/sign`, {
      method:  'POST',
      mode:    'cors' as const,
      body:    JSON.stringify(payload),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error('Unable to get signature');
      }
      const res = await response.json();
      return res.signature;
    }).then((signature) => {
      const signatureObj = new Signature({
        keyType: KeyType.ED25519,
        data:    Buffer.from(signature, 'hex'),
      });
      return new SignedDelegate({
        delegateAction,
        signature: signatureObj,
      });
    });
  }

  async signAndSendActionsWithRecoveryKey({
    oidcToken,
    accountId,
    recoveryPK,
    actions,
  }) {
    const signedDelegate = await this.createSignedDelegateWithRecoveryKey({
      oidcToken,
      accountId,
      recoveryPK,
      actions,
    }).catch((err) => {
      console.log(err);
      captureException(err);
      throw new Error('Unable to sign delegate action');
    });
    const encodedSignedDelegate = encodeSignedDelegate(signedDelegate);
    return fetch(network.relayerUrl, {
      method:  'POST',
      mode:    'cors',
      body:    JSON.stringify(Array.from(encodedSignedDelegate)),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    }).catch((err) => {
      console.log('Unable to sign and send action with recovery key', err);
      captureException(err);
    });
  }
}

export default FastAuthController;
