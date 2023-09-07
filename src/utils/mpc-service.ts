import { Signature } from '@near-js/crypto';
import { serialize } from 'borsh';
import { sha256 } from 'js-sha256';

import { ConstructSignature } from './types';
import { SCHEMA } from '@near-js/transactions';

const hashToken = (oidcToken: string): number[] => {
  const tokenHash = sha256.create();
  tokenHash.update(oidcToken);
  return tokenHash.array();
};

export const getUserCredentialsFrpSignature = ({
  salt, oidcToken, shouldHashToken, keypair
}: ConstructSignature): Signature => {
  const value = ({ salt });
  const saltSerialize = serialize(new Map([[Object, { kind: 'struct', fields: [['salt', 'u32']] }]]), value);

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

  return keypair.sign(new Uint8Array(hash.arrayBuffer()));
};

export const getSignRequestFrpSignature = ({
  salt, oidcToken, keypair, delegateAction
}): Signature => {
  const saltSerialize = serialize(new Map([[Object, { kind: 'struct', fields: [['salt', 'u32']] }]]), ({ salt }));
  const delegateActionSerialize = serialize(SCHEMA, delegateAction);
  // serialize(new Map([[Object, { kind: 'struct', fields: [['delegate_action', [32]]] }]]), ({ delegate_action: delegateAction }));
  const oidcTokenSerialize = serialize(new Map([[Object, { kind: 'struct', fields: [['oidc_token', 'string']] }]]), ({ oidc_token: oidcToken }));
  // const tokenSerialize = serialize(new Map([[Object, { kind: 'struct', fields: [['delegate_action', [32]]] }], [Object, { kind: 'struct', fields: [['oidc_token_hash', [32]]] }]]), ({ delegate_action: delegateAction, oidc_token_hash: hashToken(oidcToken) }));
  const publicKeySerialize = serialize(new Map([[Object, { kind: 'struct', fields: [['public_key', [32]]] }]]), ({ public_key: Array.from(keypair.getPublicKey().data) }));
  const mergeArray = new Uint8Array(
    saltSerialize.length + delegateActionSerialize.length + oidcTokenSerialize.length + publicKeySerialize.length + 1
  );
  mergeArray.set(saltSerialize);
  mergeArray.set(delegateActionSerialize, saltSerialize.length);
  mergeArray.set(oidcTokenSerialize, delegateActionSerialize.length + saltSerialize.length);
  mergeArray.set([0], saltSerialize.length + delegateActionSerialize.length + oidcTokenSerialize.length);
  mergeArray.set(
    publicKeySerialize, saltSerialize.length + delegateActionSerialize.length + oidcTokenSerialize.length + 1
  );
  const hash = sha256.create();
  hash.update(mergeArray);
  return keypair.sign(new Uint8Array(hash.arrayBuffer()));
};
