import { KeyPair } from 'near-api-js';

import { network } from '../utils/config';
import {
  CLAIM, getUserCredentialsFrpSignature
} from '../utils/mpc-service';

/**
 * Fetches the account IDs associated with a given public key.
 *
 * @param publicKey - The public key to fetch the account IDs for.
 * @param options - An object containing the following properties:
 * - returnEmpty: A boolean indicating whether to return an empty array if no account IDs are found.
 * @returns A promise that resolves to an array of account IDs.
 * @throws Will throw an error if the fetch request fails.
 */

type Option= {
  returnEmpty?: boolean;
}
export const fetchAccountIds = async (publicKey: string, options?: Option): Promise<string[]> => {
  // retrieve from firebase
  let accountIds = [];
  if (publicKey) {
    if (window.firestoreController) {
      const accountId = await window.firestoreController.getAccountIdByPublicKey(publicKey);
      if (accountId) {
        return [accountId];
      }
    }
    // retrieve from kitwallet
    const res = await fetch(`${network.fastAuth.authHelperUrl}/publicKey/${publicKey}/accounts`);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    accountIds = await res.json();
  }

  if (accountIds.length === 0 && !options?.returnEmpty) {
    throw new Error('Unable to retrieve account id');
  }

  return accountIds;
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

  const response = await fetch(`${network.fastAuth.mpcRecoveryUrl}/new_account`, options);
  if (!response?.ok) {
    throw new Error('Network response was not ok');
  }

  return response.json();
};
