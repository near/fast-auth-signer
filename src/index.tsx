import i18next from 'i18next';
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';

import App from './App';
import lang_de from './translations/de.json';
import lang_en from './translations/en.json';

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

const container = document.getElementById('root');
const root = createRoot(container); // createRoot(container!) if you use TypeScript
root.render(
  <I18nextProvider i18n={i18next}>
    <App />
  </I18nextProvider>
);
