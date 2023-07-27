import debug from 'debug';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';

import AddDevice from './components/AddDevice/AddDevice';
import AuthIndicator from './components/AuthIndicator/AuthIndicator';
import CreateAccount from './components/CreateAccount/CreateAccount';
import Layout from './components/Layout/Layout';
import Sign from './components/Sign/Sign';
import FastAuthController from './lib/controller';
// import GlobalStyle from './styles';
import './styles/theme.css';
import './styles/globals.css';

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
      {/* <GlobalStyle /> */}
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<AuthIndicator controller={window.fastAuthController} />} />
            <Route path="add-device" element={<AddDevice />} />
            <Route path="create-account" element={<CreateAccount />} />
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
