import debug from 'debug';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import AuthIndicator from './components/AuthIndicator/AuthIndicator';
import FastAuthController from './lib/controller';
import GlobalStyle from './styles';

(window as any).fastAuthController = new FastAuthController({
  accountId: 'maximushaximus.testnet',
  networkId: 'testnet'
});

const faLog = debug('fastAuth');
const log = faLog.extend('App');
const log2 = log.extend('watwat');

// @ts-ignore
console.log('process.env.debug', process.env.DEBUG);

// @ts-ignore
console.log('faLog', faLog.enabled);
// @ts-ignore
console.log('log', log.enabled);
export default function App() {
  faLog('init');
  log('faLog');
  log2('faLogzzzzz');

  const { t, i18n } = useTranslation('common');

  return (
    <>
      <GlobalStyle />
      <AuthIndicator controller={window.fastAuthController} />
      <h1>{t('main.title')}</h1>
      <button type="button" onClick={() => i18n.changeLanguage('de')}>de</button>
      <button type="button" onClick={() => i18n.changeLanguage('en')}>en</button>
      <p>{t('main.titleDesc')}</p>
    </>
  );
}
