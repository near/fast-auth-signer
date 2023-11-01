import * as Sentry from '@sentry/react';
import i18next from 'i18next';
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';

import App from './App';
import lang_de from './translations/de.json';
import lang_en from './translations/en.json';
import { networkId, network } from './utils/config';

i18next.init({
  interpolation: { escapeValue: false }, // React already does escaping
  lng:           'en', // language to use
  resources:     {
    en: {
      common: lang_en // 'common' is our custom namespace
    },
    de: {
      common: lang_de
    },
  },
});

Sentry.init({
  environment:           networkId,
  dsn:                   network.sentryDsn,
  integrations: [
    new Sentry.BrowserTracing({
      // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
      tracePropagationTargets: [
        'localhost',
        // MAINNET
        'https://mpc-recovery-leader-mainnet-tmp-cg7nolnlpa-ue.a.run.app',
        'https://api.kitwallet.app',
        // TESTNET
        'https://mpc-recovery-leader-dev-7tk2cmmtcq-ue.a.run.app',
        'https://testnet-api.kitwallet.app'
      ],
    }),
    new Sentry.Replay(),
  ],
  // Performance Monitoring
  tracesSampleRate:         1.0, // Capture 100% of the transactions
});

const container = document.getElementById('root');
const root = createRoot(container); // createRoot(container!) if you use TypeScript
root.render(
  <I18nextProvider i18n={i18next}>
    <App />
  </I18nextProvider>
);
