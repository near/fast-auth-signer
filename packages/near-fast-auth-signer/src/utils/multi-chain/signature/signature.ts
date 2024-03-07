import { SignedDelegate } from '@near-js/transactions';
import { Account } from 'near-api-js';

import { RSVSignature } from './types';
import { parseSignedDelegateForRelayer } from '../relayer';

const toRVS = (signature: string): RSVSignature => {
  const parsedJSON = JSON.parse(signature) as [string, string];

  return {
    v: parsedJSON[0].slice(0, 2) === '02' ? 0 : 1,
    r: parsedJSON[0].slice(2),
    s: parsedJSON[1],
  };
};

export const signMPC = async (
  signedDelegate: SignedDelegate,
  account: Account,
  relayerUrl: string
): Promise<RSVSignature> => {
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
