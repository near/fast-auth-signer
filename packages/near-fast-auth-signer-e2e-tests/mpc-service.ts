import { KeyPair } from '@near-js/crypto';
import { serialize } from 'borsh';
import { sha256 } from 'js-sha256';

const CLAIM = 3177899144;
const mpcRecoveryUrl = 'https://mpc-recovery-leader-testnet.api.pagoda.co';

type UserCredentialsFrpSignature = {
  salt: number;
  oidcToken: string;
  shouldHashToken: boolean;
  keypair: KeyPair;
};

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

type LimitedAccessKey = {
  public_key: string,
  receiver_id: string,
  allowance: string,
  method_names: string
}

type NewAccountResponse =
  | {
  type: 'ok',
  create_account_options: {
    full_access_keys: string[] | null,
    limited_access_keys: LimitedAccessKey[] | null,
    contract_bytes: string[] | null
  },
  user_recovery_public_key: string,
  near_account_id: string
}
  | {
  type: 'err',
  msg: string
};

export const claimToken = async (oidcToken: string): Promise<KeyPair> => {
  const keypair = KeyPair.fromRandom('ED25519');
  const signature = getUserCredentialsFrpSignature({
    salt:            CLAIM,
    oidcToken,
    shouldHashToken: true,
    keypair,
  });

  const data = {
    oidc_token_hash: sha256(oidcToken),
    frp_signature:   signature,
    frp_public_key:  keypair.getPublicKey().toString(),
  };

  await fetch(`${mpcRecoveryUrl}/claim_oidc`, {
    method:  'POST',
    mode:    'cors' as const,
    body:    JSON.stringify(data),
    headers: new Headers({ 'Content-Type': 'application/json' }),
  });

  return keypair;
};

/**
 * This function creates a new account on the NEAR blockchain by sending a request to the /new_account endpoint of the MPC recovery service.
 *
 * @param accountId - The ID of the new account to be created on the NEAR blockchain.
 * @param fullAccessKeys - An array of full access keys to be added to the account.
 * @param limitedAccessKeys - An array of objects, each representing a limited access key to be associated with the account. Each object has the following properties:
 * - public_key: The public key of the limited access key.
 * - receiver_id: The contract_ID that the limited access key is authorized to call.
 * - allowance: The maximum amount of NEAR tokens that the limited access key is allowed to spend on gas fees.
 * - method_names: A string of comma-separated method names that the limited access key is allowed to call.
 * @param accessToken - The OIDC access token.
 * @param oidcKeypair - The public and private key pair of the FRP.
 * @returns A promise that resolves to an object of type NewAccountResponse. This object contains the result of the account creation process. It can either be of type 'ok' with the account details or of type 'err' with an error message.
 * @throws An error if the fetch request fails.
 */
export const createNEARAccount = async ({
  accountId,
  fullAccessKeys = [],
  limitedAccessKeys = [],
  accessToken,
  oidcKeypair,
}: {
  accountId: string,
  fullAccessKeys?: string[],
  limitedAccessKeys?: LimitedAccessKey[],
  accessToken: string,
  oidcKeypair: KeyPair
}): Promise<NewAccountResponse> => {
  const CLAIM_SALT = CLAIM + 2;
  const signature = getUserCredentialsFrpSignature({
    salt:            CLAIM_SALT,
    oidcToken:       accessToken,
    shouldHashToken: false,
    keypair:         oidcKeypair,
  });

  const data = {
    near_account_id:        accountId,
    create_account_options: {
      full_access_keys:    fullAccessKeys,
      limited_access_keys: limitedAccessKeys,
    },
    oidc_token:                     accessToken,
    user_credentials_frp_signature: signature,
    frp_public_key:                 oidcKeypair.getPublicKey().toString(),
  };

  const options = {
    method:  'POST',
    mode:    'cors' as const,
    body:    JSON.stringify(data),
    headers: new Headers({ 'Content-Type': 'application/json' }),
  };

  const response = await fetch(`${mpcRecoveryUrl}/new_account`, options);
  if (!response?.ok) {
    throw new Error('Network response was not ok');
  }

  return response.json();
};
