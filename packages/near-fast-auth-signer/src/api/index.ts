import { captureException } from '@sentry/react';
import { KeyPair } from 'near-api-js';

import { network } from '../utils/config';
import {
  CLAIM, getUserCredentialsFrpSignature
} from '../utils/mpc-service';

// Use this function to implement wait logic for async process
const withTimeout = async (promise, timeoutMs) => {
  // Create a promise that resolves with false after timeoutMs milliseconds
  const timeoutPromise = new Promise((resolve) => { setTimeout(() => resolve(false), timeoutMs); });

  // Race the input promise against the timeout
  return Promise.race([promise, timeoutPromise]);
};

/**
 * Fetches the account IDs associated with a given public key.
 *
 * @param publicKey - The public key to fetch the account IDs for.
 * @returns A promise that resolves to an array of account IDs.
 * @throws Will throw an error if the fetch request fails.
 */
const KIT_WALLET_WAIT_DURATION = 10000; // 10s
export const fetchAccountIds = async (publicKey: string): Promise<string[]> => {
  if (publicKey) {
    if (window.firestoreController) {
      const accountId = await window.firestoreController.getAccountIdByPublicKey(publicKey);
      if (accountId) {
        return [accountId];
      }
    }

    try {
      const res = await withTimeout(fetch(`${network.fastAuth.authHelperUrl}/publicKey/${publicKey}/accounts`), KIT_WALLET_WAIT_DURATION);
      if (res) {
        const ids = await res.json();
        return ids;
      }
      return [];
    } catch (error) {
      console.log('fetchAccountIds', error);
      captureException(error);
      return [];
    }
  }

  return [];
};

/**
 * This function fetches account id from given two public keys.
 * Webuathn currently prompts two public keys by default and we need to discover which key is currently on chain.
 * Since we store public key <-> account id in firestore, one of the public key will return the result fast and we do not need to wait for both request to resolve.
 * It is possible that both public keys are not on chain, in that case we return null.
 * @param publicKeyA
 * @param publicKeyB
 * @returns object with account id and public key
 */
export const fetchAccountIdsFromTwoKeys = async (
  publicKeyA,
  publicKeyB
): Promise<{ accId: string, publicKey: string}> => {
  const accountIdsFromPublicKeyA = fetchAccountIds(publicKeyA);
  const accountIdsFromPublicKeyB = fetchAccountIds(publicKeyB);

  const firstResult = await Promise.race([accountIdsFromPublicKeyA, accountIdsFromPublicKeyB]);
  const firstKey = firstResult === await accountIdsFromPublicKeyA ? publicKeyA : publicKeyB;
  if (firstResult.length > 0) {
    return {
      accId:     firstResult[0],
      publicKey: firstKey
    };
  }

  const secondResult = await (
    firstResult === await accountIdsFromPublicKeyA ? accountIdsFromPublicKeyB : accountIdsFromPublicKeyA
  );
  const secondKey = firstKey === publicKeyA ? publicKeyB : publicKeyA;
  if (secondResult.length > 0) {
    return {
      accId:     secondResult[0],
      publicKey: secondKey
    };
  }

  return null;
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
