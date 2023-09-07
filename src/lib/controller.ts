import { Account, Connection } from '@near-js/accounts';
import BN from 'bn.js';
import { createKey, getKeys } from '@near-js/biometric-ed25519';
import { KeyPairEd25519, KeyType, PublicKey } from '@near-js/crypto';
import { InMemoryKeyStore } from '@near-js/keystores';
import { SCHEMA, actionCreators, encodeSignedDelegate, buildDelegateAction, Signature, SignedDelegate } from '@near-js/transactions';
import { baseEncode, serialize } from 'borsh';
import { sha256 } from 'js-sha256';

import networkParams from './networkParams';
import { network } from '../utils/config';
import { getSignRequestFrpSignature, getUserCredentialsFrpSignature } from '../utils/mpc-service';

const { addKey, functionCallAccessKey, fullAccessKey } = actionCreators;
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

    this.keyStore = new InMemoryKeyStore();

    this.connection = Connection.fromConfig({
      networkId,
      provider: { type: 'JsonRpcProvider', args: { url: config.nodeUrl, headers: config.headers } },
      signer:   { type: 'InMemorySigner', keyStore: this.keyStore },
    });

    this.networkId = networkId;
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

  async fetchNonce({ accountId, publicKey }) {
    const rawAccessKey = await this.connection.provider.query({
      request_type: 'view_access_key',
      account_id: accountId,
      public_key: publicKey,
      finality: 'optimistic',
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

  // This call need to be called after new oidc token is generated
  // https://github.com/near/mpc-recovery#claim-oidc-id-token-ownership
  async claimOidcToken(oidcToken) {
    const CLAIM_SALT = 3177899144 + 0;
    const keypair = await this.getKey();
    const signObj = getUserCredentialsFrpSignature({
      salt: CLAIM_SALT,
      oidcToken,
      shouldHashToken: true,
      keypair,
    });

    const data = {
      oidc_token_hash: sha256(oidcToken),
      frp_signature: Buffer.from(signObj.signature).toString('hex'),
      frp_public_key: keypair.getPublicKey().toString(),
    };

    // https://github.com/near/mpc-recovery#claim-oidc-id-token-ownership
    // TODO: replace newMpcRecoveryUrl to mpcRecovery when all endpoint is implemented
    return fetch(`${network.fastAuth.newMpcRecoveryUrl}/claim_oidc`, {
      method: 'POST',
      mode: 'cors' as const,
      body: JSON.stringify(data),
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
    const GET_USER_SALT = 3177899144 + 2;
    const keypair = await this.getKey();
    const signObj = getUserCredentialsFrpSignature({
      salt: GET_USER_SALT,
      oidcToken,
      shouldHashToken: false,
      keypair,
    });

    const data = {
      oidc_token: oidcToken,
      frp_signature: Buffer.from(signObj.signature).toString('hex'),
      frp_public_key: keypair.getPublicKey().toString(),
    };

    // https://github.com/near/mpc-recovery#user-credentials
    // TODO: replace newMpcRecoveryUrl to mpcRecovery when all endpoint is implemented
    return fetch(`${network.fastAuth.newMpcRecoveryUrl}/user_credentials`, {
      method: 'POST',
      mode: 'cors' as const,
      body: JSON.stringify(data),
      headers: new Headers({ 'Content-Type': 'application/json' }),
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

  async getBlock() {
    return this.connection.provider.block({ finality: 'final' });
  }

  async signAndSendAddKeyWithRecoveryKey({
    oidcToken,
    allowance,
    contractId,
    methodNames,
    publicKeyLak,
    webAuthNPublicKey,
    accountId,
    recoveryPK,
  }) {
    const GET_SIGNATURE_SALT = 3177899144 + 3;
    const GET_USER_SALT = 3177899144 + 2;
    const localKey = await this.getKey();
    const actions = [
      addKey(
        PublicKey.from(publicKeyLak),
        functionCallAccessKey(contractId, methodNames || [], allowance)
      ),
      addKey(PublicKey.from(webAuthNPublicKey), fullAccessKey())
    ];
    const { header } = await this.getBlock();
    const delegateAction = buildDelegateAction({
      actions,
      maxBlockHeight: new BN(header.height).add(new BN(60)),
      nonce: await this.fetchNonce({ accountId, publicKey: recoveryPK }),
      publicKey: PublicKey.from(recoveryPK),
      receiverId: accountId,
      senderId: accountId,
    });
    const encodedDelegateAction = Buffer.from(serialize(SCHEMA, delegateAction)).toString('base64');
    const userCredentialsFrpSignature = getUserCredentialsFrpSignature({
      salt: GET_USER_SALT,
      oidcToken,
      shouldHashToken: false,
      keypair: localKey,
    });
    const signRequestFrpSignature = getSignRequestFrpSignature({
      salt: GET_SIGNATURE_SALT,
      oidcToken,
      keypair: localKey,
      delegateAction,
    });

    const payload = {
      delegate_action: encodedDelegateAction,
      oidc_token: oidcToken,
      frp_signature: Buffer.from(signRequestFrpSignature.signature).toString('hex'),
      user_credentials_frp_signature: Buffer.from(userCredentialsFrpSignature.signature).toString('hex'),
      frp_public_key: localKey.getPublicKey().toString(),
    };

    // https://github.com/near/mpc-recovery#sign
    // TODO: replace newMpcRecoveryUrl to mpcRecovery when all endpoint is implemented
    return fetch(`${network.fastAuth.newMpcRecoveryUrl}/sign`, {
      method: 'POST',
      mode: 'cors' as const,
      body: JSON.stringify(payload),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    }).then(async (response) => {
      if (!response.ok) {
        console.log('response', response);
        throw new Error('Unable to get signature');
      }
      const res = await response.json();
      return res.signature;
    }).then((signature) => {
      const signatureObj = new Signature({
        keyType: KeyType.ED25519,
        data:    Buffer.from(signature, 'hex'),
      });
      const signedDelegate = new SignedDelegate({
        delegateAction,
        signature: signatureObj,
      });
      const encodedSignedDelegate = encodeSignedDelegate(signedDelegate);
      return fetch(network.relayerUrl, {
        method:  'POST',
        mode:    'cors',
        body:    JSON.stringify(Array.from(encodedSignedDelegate)),
        headers: new Headers({ 'Content-Type': 'application/json' }),
      });
    }).catch((err) => {
      console.log(err);
      throw new Error('Unable to send delegate action');
    });
  }
}

export default FastAuthController;
