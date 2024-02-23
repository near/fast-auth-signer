import { useEffect } from 'react';

import FastAuthController from '../../lib/controller';
import FirestoreController from '../../lib/firestoreController';
import { networkId } from '../../utils/config';

const TEST_ACCOUNT_ID = 'harisvalj.testnet';
window.fastAuthController = new FastAuthController({
  accountId: TEST_ACCOUNT_ID,
  networkId
});

function InitializeGlobals() {
  useEffect(() => {
    (async function () {
      if (!window.firestoreController) {
        window.firestoreController = new FirestoreController();
      }
      try {
        const accountId = await window.firestoreController.getAccountIdFromOidcToken();
        console.log('AccountId set as ', accountId);
        if (accountId) window.fastAuthController.setAccountId(accountId);
      } catch (e) {
        console.log('AccountId not set, error: ', e.message);
      }
    }());
  }, []); return null;
}

export default InitializeGlobals;
