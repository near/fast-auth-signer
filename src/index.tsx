import * as Sentry from '@sentry/react';
import i18next from 'i18next';
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';

import App from './App';
import lang_de from './translations/de.json';
import lang_en from './translations/en.json';
import { networkId } from './utils/config';

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
  dsn:          'https://bc7ad0bdc2de28704b4b695e2c3f3e35@o4506119713390592.ingest.sentry.io/4506119715028992',
  integrations: [
    new Sentry.BrowserTracing({
      // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
      tracePropagationTargets: [
        'localhost',
        'https://mpc-recovery-leader-mainnet-tmp-cg7nolnlpa-ue.a.run.app',
        'https://api.kitwallet.app',
        'https://mpc-recovery-leader-dev-7tk2cmmtcq-ue.a.run.app',
        'https://testnet-api.kitwallet.app'
      ],
    }),
    new Sentry.Replay(),
  ],
  // Performance Monitoring
  tracesSampleRate:         1.0, // Capture 100% of the transactions
  // Session Replay
  replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
  replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
});

const container = document.getElementById('root');
const root = createRoot(container); // createRoot(container!) if you use TypeScript
root.render(
  <I18nextProvider i18n={i18next}>
    <App />
  </I18nextProvider>
);
