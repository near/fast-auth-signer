import { useEffect } from 'react';

import FastAuthController from '../lib/controller';
import FirestoreController from '../lib/firestoreController';
import { networkId } from '../utils/config';

window.fastAuthController = new FastAuthController({
  accountId: 'harisvalj.testnet',
  networkId
});

function InitializeGlobals() {
  useEffect(() => {
    (async function () {
      if (!window.firestoreController) {
        window.firestoreController = new FirestoreController();
      }
      const accountId = await window.firestoreController.getAccountIdFromOidcToken();

      console.log('accountId ', accountId);
      if (accountId) window.fastAuthController.setAccountId(accountId);
    }());
  }, []); return null;
}

export default InitializeGlobals;
