import debug from 'debug';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Navigate, Route, BrowserRouter as Router, Routes, useLocation
} from 'react-router-dom';

import AddDevice from './components/AddDevice/AddDevice';
import AuthCallbackPage from './components/AuthCallback/AuthCallback';
import AuthIndicator from './components/AuthIndicator/AuthIndicator';
import CreateAccount from './components/CreateAccount/CreateAccount';
import Devices from './components/Devices/Devices';
import Layout from './components/Layout/Layout';
import Login from './components/Login/Login';
import Sign from './components/Sign/Sign';
import VerifyEmailPage from './components/VerifyEmail/verify-email';
import FastAuthController from './lib/controller';
// import GlobalStyle from './styles';
import './styles/theme.css';
import './styles/globals.css';

(window as any).fastAuthController = new FastAuthController({
  networkId:        'testnet',
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

function RemoveTrailingSlash({ ...rest }) {
  const location = useLocation();

  // If the last character of the url is '/'
  if (location.pathname.match('/.*/$')) {
    return (
      <Navigate
        replace
        {...rest}
        to={{
          pathname: location.pathname.replace(/\/+$/, ''),
          search:   location.search
        }}
      />
    );
  } return null;
}

export default function App() {
  faLog('init');
  log('faLog');
  log2('faLogzzzzz');

  const { t, i18n } = useTranslation('common');

  return (
    <>
      {/* <GlobalStyle /> */}
      <Router>
        <RemoveTrailingSlash />
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<AuthIndicator controller={window.fastAuthController} />} />
            <Route path="add-device" element={<AddDevice controller={window.fastAuthController} />} />
            <Route path="create-account" element={<CreateAccount controller={window.fastAuthController} />} />
            <Route path="sign" element={<Sign controller={window.fastAuthController} />} />
            <Route path="verify-email" element={<VerifyEmailPage />} />
            <Route path="login" element={<Login controller={window.fastAuthController} />} />
            <Route path="auth-callback" element={<AuthCallbackPage controller={window.fastAuthController} />} />
            <Route path="devices" element={<Devices controller={window.fastAuthController} />} />
          </Route>
        </Routes>
      </Router>
      <h1>{t('main.title')}</h1>
      <button type="button" onClick={() => i18n.changeLanguage('de')}>de</button>
      <button type="button" onClick={() => i18n.changeLanguage('en')}>en</button>
      <p>{t('main.titleDesc')}</p>
      {/* TEST CODE DELETE LATER */}
      <button type="button" onClick={() => localStorage.clear()}>Clear localStorage</button>
    </>
  );
}
