import { network } from '../utils/config';
import {
  CLAIM, getUserCredentialsFrpSignature
} from '../utils/mpc-service';

/**
 * Fetches the account IDs associated with a given public key.
 *
 * @param publicKey - The public key to fetch the account IDs for.
 * @returns A promise that resolves to an array of account IDs.
 * @throws Will throw an error if the fetch request fails.
 */
export const fetchAccountIds = async (publicKey: string): Promise<string[]> => {
  const res = await fetch(`${network.fastAuth.authHelperUrl}/publicKey/${publicKey}/accounts`);
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  return res.json();
};

type NewAccountResponse =
  | {
      type: 'ok',
      create_account_options: {
        full_access_keys: string[] | null,
        limited_access_keys: {
          public_key: string,
          allowance: string,
          receiver_id: string,
          method_names: string
        }[] | null,
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
 * Creates a new NEAR account.
 *
 * @param {Object} params - The parameters for creating a new NEAR account.
 * @param {string} params.accountId - The account ID for the new NEAR account.
 * @param {string} params.publicKeyFak - The full access key public key for the new NEAR account.
 * @param {string} params.public_key_lak - The limited access key public key for the new NEAR account.
 * @param {string} params.contract_id - The contract ID for the new NEAR account.
 * @param {string} params.methodNames - The method names for the new NEAR account.
 * @param {string} params.accessToken - The access token for the new NEAR account.
 * @param {any} params.oidcKeypair - The OIDC keypair for the new NEAR account.
 * @returns {Promise<Object>} A promise that resolves to an object containing the account creation options and other details.
 * @throws Will throw an error if the account creation fails.
 */
export const createNEARAccount = async ({
  accountId,
  publicKeyFak,
  public_key_lak,
  contract_id,
  methodNames,
  accessToken,
  oidcKeypair,
}: {
  accountId: string,
  publicKeyFak: string,
  public_key_lak: string,
  contract_id: string,
  methodNames: string,
  accessToken: string,
  oidcKeypair: any
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
      full_access_keys:    publicKeyFak ? [publicKeyFak] : [],
      // limited_access_keys: public_key_lak ? [
      //   {
      //     public_key:   public_key_lak,
      //     receiver_id:  contract_id,
      //     allowance:    '250000000000000',
      //     method_names: (methodNames && methodNames.split(',')) || '',
      //   },
      // ] : [],
      limited_access_keys: {
        public_key:   'limited_key1',
        allowance:    '100',
        receiver_id:  'example_receiver',
        method_names: 'example_method'
      },
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

  const res = await response.json();
  console.log({ res });
  debugger;

  return res;
};
