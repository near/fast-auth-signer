import { Account } from '@near-js/accounts';
import {
  actionCreators,
} from '@near-js/transactions';
import BN from 'bn.js';
import { ethers } from 'ethers';

import { RSVSignature } from './types';
import { parseSignedDelegateForRelayer } from '../relayer';

export type ChainSignatureContracts = 'multichain-testnet-2.testnet'

const NEAR_MAX_GAS = new BN('300000000000000');

const toRVS = (signature: string): RSVSignature => {
  const parsedJSON = JSON.parse(signature) as [string, string];

  return {
    r: parsedJSON[0].slice(2),
    s: parsedJSON[1],
  };
};

/**
 * Signs a transaction hash using a specified account and path, then sends the signed transaction
 * to a relayer service for execution. It attempts to fetch the signature from the transaction
 * receipt up to 3 times with a delay of 10 seconds between each attempt.
 *
 * @param {string | ethers.BytesLike} transactionHash - The hash of the transaction to be signed.
 * @param {string} path - The derivation path used for signing the transaction.
 * @param {Account} account - The NEAR account object used for signing the transaction.
 * @param {string} relayerUrl - The URL of the relayer service to which the signed transaction is sent.
 * @param {ChainSignatureContracts} contract - The contract identifier for chain signature operations.
 * @returns {Promise<RSVSignature>} A promise that resolves to the RSV signature of the signed transaction.
 * @throws {Error} Throws an error if the signature cannot be fetched after 3 attempts.
 */
export const sign = async (
  transactionHash: string | ethers.BytesLike,
  path: string,
  account: Account,
  relayerUrl: string,
  contract: ChainSignatureContracts
): Promise<RSVSignature> => {
  const functionCall = actionCreators.functionCall(
    'sign',
    {
      payload: Array.from(ethers.getBytes(transactionHash)).slice().reverse(),
      path,
    },
    NEAR_MAX_GAS,
    new BN(0)
  );

  const signedDelegate = await account.signedDelegate(
    {
      receiverId:     contract,
      actions:        [functionCall],
      blockHeightTtl: 60,
    }
  );

  // TODO: add support for creating the signed delegate using the mpc recovery service with an oidc_token

  const res = await fetch(`${relayerUrl}/send_meta_tx_async`, {
    method:  'POST',
    mode:    'cors',
    body:    JSON.stringify(parseSignedDelegateForRelayer(signedDelegate)),
    headers: new Headers({ 'Content-Type': 'application/json' }),
  });

  const txHash = await res.text();

  // TODO: check if we really need to retry here
  let attempts = 0;
  const getSignature = async (): Promise<RSVSignature> => {
    if (attempts >= 3) {
      throw new Error('Signature error, please retry');
    }

    const txStatus = await account.connection.provider.txStatus(
      txHash,
      account.accountId
    );

    const signature: string = txStatus.receipts_outcome.reduce((acc, curr) => {
      if (acc) {
        return acc;
      }
      const { status } = curr.outcome;
      return (
        typeof status === 'object'
          && status.SuccessValue
          && status.SuccessValue !== ''
          && Buffer.from(status.SuccessValue, 'base64').toString('utf-8')
      );
    }, '');

    if (signature) {
      return toRVS(signature);
    }

    await new Promise((resolve) => { setTimeout(resolve, 10000); });
    attempts += 1;
    return getSignature();
  };

  return getSignature();
};

export async function getRootPublicKey(
  contract: ChainSignatureContracts,
  account: Account,
  relayerUrl: string
): Promise<string | undefined> {
  const functionCall = actionCreators.functionCall(
    'public_key',
    {},
    NEAR_MAX_GAS,
    new BN(0)
  );

  const signedDelegate = await window.fastAuthController.signDelegateAction(
    {
      receiverId: contract,
      actions:    [functionCall],
      signerId:   account.accountId
    }
  );

  const res = await fetch(`${relayerUrl}/send_meta_tx_async`, {
    method:  'POST',
    mode:    'cors',
    body:    JSON.stringify(parseSignedDelegateForRelayer(signedDelegate)),
    headers: new Headers({ 'Content-Type': 'application/json' }),
  });

  const txHash = await res.text();

  const txStatus = await account.connection.provider.txStatus(
    txHash,
    account.accountId
  );

  const publicKey: string = txStatus.receipts_outcome.reduce((acc, curr) => {
    if (acc) {
      return acc;
    }
    const { status } = curr.outcome;
    return (
      typeof status === 'object'
        && status.SuccessValue
        && status.SuccessValue !== ''
        && Buffer.from(status.SuccessValue, 'base64').toString('utf-8')
    );
  }, '');

  return publicKey.replace(/^"|"$/g, '');
}
