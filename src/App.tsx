import debug from 'debug';
import * as React from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import AuthIndicator from './components/AuthIndicator/AuthIndicator';
import Layout from './components/Layout/Layout';
import Login from './components/Login/Login';
import Sign from './components/Sign/Sign';
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
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<AuthIndicator controller={window.fastAuthController} />} />
            <Route path="login" element={<Login />} />
            <Route path="sign" element={<Sign />} />
          </Route>
        </Routes>
      </Router>
      <h1>{t('main.title')}</h1>
      <button type="button" onClick={() => i18n.changeLanguage('de')}>de</button>
      <button type="button" onClick={() => i18n.changeLanguage('en')}>en</button>
      <p>{t('main.titleDesc')}</p>
    </>
  );
}
