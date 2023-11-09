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

  return (
    <div id="ws-loaded">Wallet selector instance is ready</div>
  );
}
