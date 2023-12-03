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

if (network.sentryDsn) {
  Sentry.init({
    environment:           networkId,
    dsn:                   network.sentryDsn,
    integrations: [
      new Sentry.BrowserTracing({
        // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
        tracePropagationTargets: [
          'localhost',
          network.fastAuth.mpcRecoveryUrl,
          network.fastAuth.authHelperUrl,
        ],
      }),
    ],
    // Performance Monitoring
    tracesSampleRate:         0.1, // Capture 10% of transactions

    // Reconstructing the URL to exclude sensitive query parameters
    beforeSend(event) {
      if (event.request && event.request.url) {
        const url = new URL(event.request.url);
        const queryParams = url.searchParams;

        // Remove sensitive query parameters
        queryParams.delete('publicKeyFak');
        queryParams.delete('public_key_lak');

        event.request.url = url.toString();
      }

      return event;
    },

    // Hide transaction history
    beforeBreadcrumb() {
      return null;
    },

    // Only send issues if network is mainnet
    enabled: networkId === 'mainnet',
  });
}

const container = document.getElementById('root');
const root = createRoot(container); // createRoot(container!) if you use TypeScript
root.render(
  <I18nextProvider i18n={i18next}>
    <App />
  </I18nextProvider>
);
