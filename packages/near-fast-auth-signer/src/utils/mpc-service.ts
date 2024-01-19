import { PublicKey } from '@near-js/crypto';
import { Action, SCHEMA, actionCreators } from '@near-js/transactions';
import { serialize } from 'borsh';
import { sha256 } from 'js-sha256';

import { network } from './config';
import { SignRequestFrpSignature, UserCredentialsFrpSignature } from './types';

export const CLAIM = 3177899144;

const {
  addKey, functionCallAccessKey, fullAccessKey, deleteKey
} = actionCreators;

const hashToken = (oidcToken: string): number[] => {
  const tokenHash = sha256.create();
  tokenHash.update(oidcToken);
  return tokenHash.array();
};

export const convertToHex = (arr: Uint8Array): string => Buffer.from(arr).toString('hex');

export const getUserCredentialsFrpSignature = ({
  salt, oidcToken, shouldHashToken, keypair
}: UserCredentialsFrpSignature): string => {
  const saltSerialize = serialize(new Map([[Object, { kind: 'struct', fields: [['salt', 'u32']] }]]), ({ salt }));
  const token = shouldHashToken ? hashToken(oidcToken) : oidcToken;
  const tokenType = shouldHashToken ? [32] : 'string';
  const tokenSerialize = serialize(new Map([[Object, { kind: 'struct', fields: [['oidc_token', tokenType]] }]]), ({ oidc_token: token }));
  const publicKeySerialize = serialize(new Map([[Object, { kind: 'struct', fields: [['public_key', [32]]] }]]), ({ public_key: Array.from(keypair.getPublicKey().data) }));

  const mergeArray = new Uint8Array(saltSerialize.length + tokenSerialize.length + publicKeySerialize.length + 1);
  mergeArray.set(saltSerialize);
  mergeArray.set(tokenSerialize, saltSerialize.length);
  mergeArray.set([0], saltSerialize.length + tokenSerialize.length);
  mergeArray.set(publicKeySerialize, saltSerialize.length + tokenSerialize.length + 1);

  const hash = sha256.create();
  hash.update(mergeArray);

  const signature = keypair.sign(new Uint8Array(hash.arrayBuffer()));
  return convertToHex(signature.signature);
};

export const getSignRequestFrpSignature = ({
  salt, oidcToken, keypair, delegateAction
}: SignRequestFrpSignature): string => {
  const saltSerialize = serialize(new Map([[Object, { kind: 'struct', fields: [['salt', 'u32']] }]]), ({ salt }));
  const delegateActionSerialize = serialize(SCHEMA, delegateAction);
  const oidcTokenSerialize = serialize(new Map([[Object, { kind: 'struct', fields: [['oidc_token', 'string']] }]]), ({ oidc_token: oidcToken }));
  const publicKeySerialize = serialize(new Map([[Object, { kind: 'struct', fields: [['public_key', [32]]] }]]), ({ public_key: Array.from(keypair.getPublicKey().data) }));
  const mergeArray = new Uint8Array(
    saltSerialize.length + delegateActionSerialize.length + oidcTokenSerialize.length + publicKeySerialize.length + 1
  );
  mergeArray.set(saltSerialize);
  mergeArray.set(delegateActionSerialize, saltSerialize.length);
  mergeArray.set(oidcTokenSerialize, delegateActionSerialize.length + saltSerialize.length);
  mergeArray.set([0], saltSerialize.length + delegateActionSerialize.length + oidcTokenSerialize.length);
  mergeArray.set(
    publicKeySerialize,
    saltSerialize.length + delegateActionSerialize.length + oidcTokenSerialize.length + 1
  );
  const hash = sha256.create();
  hash.update(mergeArray);

  const signature = keypair.sign(new Uint8Array(hash.arrayBuffer()));
  return convertToHex(signature.signature);
};

export const getAddKeyAction = ({
  publicKeyLak,
  webAuthNPublicKey,
  contractId,
  methodNames,
  allowance,
}): Action[] => [
  addKey(PublicKey.from(webAuthNPublicKey), fullAccessKey())
].concat(
  publicKeyLak
    ? addKey(
      PublicKey.from(publicKeyLak),
      functionCallAccessKey(contractId, methodNames || [], allowance)
    )
    : []
);

export const getAddLAKAction = ({
  publicKeyLak,
  contractId,
  methodNames,
  allowance,
}): [Action] => [
  addKey(
    PublicKey.from(publicKeyLak),
    functionCallAccessKey(contractId, methodNames || [], allowance)
  )
];

export const getDeleteKeysAction = (publicKeys: string[]): Action[] => publicKeys
  .map((key) => deleteKey(PublicKey.from(key)));

export const errorMessages: Record<string, string> = {
  'auth/expired-action-code': 'Link expired, please try again.',
  'auth/invalid-action-code': 'Link expired, please try again.',
  'auth/invalid-email':       'Invalid email address.',
  'auth/user-disabled':       'User disabled',
  'auth/missing-email':       'No email found, please try again.',
};

export const verifyMpcSignature = (mpcSignature: string, originalSignature: string): boolean => {
  const mpcSignatureBytes = Uint8Array.from(Buffer.from(mpcSignature, 'hex'));
  const originalSignatureBytes = Uint8Array.from(Buffer.from(originalSignature, 'hex'));
  const claimData = { salt: CLAIM + 1, signature:  originalSignatureBytes };
  const serializedData = serialize(new Map([
    [Object, { kind: 'struct', fields: [['salt', 'u32'], ['signature', ['u8', 64]]] }]
  ]), claimData);
  const hashedData = new Uint8Array(sha256.array(serializedData));
  return network.fastAuth.mpcPublicKey.verify(hashedData, mpcSignatureBytes);
};
