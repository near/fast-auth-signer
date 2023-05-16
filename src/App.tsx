import * as React from 'react';

import AuthIndicator from './components/AuthIndicator';
import FastAuthController from './lib/controller';
import globalStyles from './styles/global-styles';

(window as any).fastAuthController = new FastAuthController({
  accountId: 'maximushaximus.testnet',
  networkId: 'testnet'
});

export default function App() {
  globalStyles();

  return (
    <AuthIndicator
      controller={window.fastAuthController}
    />
  );
}
