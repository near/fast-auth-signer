import BN from 'bn.js';
import { ethers } from 'ethers';
import { Account, transactions } from 'near-api-js';

import { RSVSignature } from './types';
import { parseSignedDelegateForRelayer } from '../relayer';

const toRVS = (signature: string): RSVSignature => {
  const parsedJSON = JSON.parse(signature) as [string, string];

  return {
    r: parsedJSON[0].slice(2),
    s: parsedJSON[1],
  };
};

export const signMPC = async (
  transactionHash: string | ethers.BytesLike,
  path: string,
  account: Account,
  relayerUrl: string
): Promise<RSVSignature> => {
  const functionCall = transactions.functionCall(
    'sign',
    {
      payload: Array.from(ethers.getBytes(transactionHash)).slice().reverse(),
      path,
    },
    new BN('300000000000000'),
    new BN(0)
  );

  const signedDelegate = await window.fastAuthController.signDelegateAction(
    {
      receiverId: 'multichain-testnet-2.testnet',
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
