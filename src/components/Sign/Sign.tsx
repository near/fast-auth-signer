import { SignedTransaction } from '@near-js/transactions';
import { transactions } from 'near-api-js';
import * as React from 'react';
import { useEffect, useState } from 'react';

import AuthIndicator from '../AuthIndicator/AuthIndicator';

function Sign({ controller }) {
  const [isSignedIn, setIsSignedIn] = useState<boolean>();
  useEffect(() => {
    async function fetchSignedInStatus2() {
      const currentlySignedIn = await controller.isSignedIn();
      const accId = await controller.userUid;
      // const detalji = await controller.listCollections(accId);
      const accountId = localStorage.getItem('near_account_id');
      const transaction = await transactions.SignedTransaction;
      console.log(transaction);
      console.log('AAAAAAAAAAAA', currentlySignedIn);
      console.log(accountId, 'AAAAAAAAAA2AA', accId);

      setTimeout(() => setIsSignedIn(currentlySignedIn), 2000);
    }

    fetchSignedInStatus2();
  }, [controller]);
  return (
    <div>
      <AuthIndicator controller={window.fastAuthController} />

      {isSignedIn ? 'Sign route' : `asda ${'isSignedIn'}`}
      {' '}
      Sign route
    </div>
  );
}

export default Sign;
