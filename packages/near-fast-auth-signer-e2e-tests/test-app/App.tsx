import React from 'react';

import useWalletSelector from './hooks/useWalletSelector';

export default function App() {
  const selectorInstance = useWalletSelector();

  console.log('selectorInstance', selectorInstance);
  if (!selectorInstance) {
    return (
      <div id="loading-ws">Loading wallet selector...</div>
    );
  }

  const onSignIn = () => {
    console.log('onSignInclicked');
    return selectorInstance
      .wallet('fast-auth-wallet')
      .then((fastAuthWallet: any) => fastAuthWallet.signIn({
        accountId:  'test',
        isRecovery: true,
      }));
  };

  return (
    <>
      <div id="ws-loaded">Wallet selector instance is ready</div>
      <button type="button" data-testid="signIn" onClick={onSignIn}>
        Go to sign in page
      </button>
    </>
  );
}
