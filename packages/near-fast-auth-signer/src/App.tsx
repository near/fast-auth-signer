import debug from 'debug';
import React, { useEffect } from 'react';
import {
  Route, BrowserRouter as Router, Routes,
} from 'react-router-dom';

import AddDevice from './components/AddDevice/AddDevice';
import AuthCallbackPage from './components/AuthCallback/AuthCallback';
import AuthIndicator from './components/AuthIndicator/AuthIndicator';
import CreateAccount from './components/CreateAccount/CreateAccount';
import Devices from './components/Devices/Devices';
import Login from './components/Login/Login';
import RemoveTrailingSlash from './components/RemoveTrailingSlash/RemoveTrailingSlash';
import RpcRoute from './components/RpcRoute/RpcRoute';
import SignTemplate from './components/Sign/SignTemplate';
import SignMessage from './components/SignMessage/SignMesage';
import SignMultichain from './components/SignMultichain/SignMultichain';
import VerifyEmailPage from './components/VerifyEmail/verify-email';
import VerifyOtpPage from './components/VerifyOtp/verify-otp';
import FastAuthController from './lib/controller';
import './styles/theme.css';
import './styles/globals.css';
import FirestoreController from './lib/firestoreController';
import GlobalStyle from './styles/index';
import { initAnalytics } from './utils/analytics';
import { basePath, networkId } from './utils/config';
import environment from './utils/environment';

(window as any).fastAuthController = new FastAuthController({
  accountId: '',
  networkId
});

if (!window.firestoreController) {
  window.firestoreController = new FirestoreController();
}

const faLog = debug('fastAuth');
const log = faLog.extend('App');
const log2 = log.extend('watwat');

// @ts-ignore
console.log('process.env.debug', environment.DEBUG);

// @ts-ignore
console.log('faLog', faLog.enabled);
// @ts-ignore
console.log('log', log.enabled);

export default function App() {
  faLog('init');
  log('faLog');
  log2('faLogzzzzz');

  useEffect(() => {
    initAnalytics().catch((error) => console.error('Error initializing analytics:', error));
  }, []);

  // @ts-ignore
  return (
    <>
      <GlobalStyle />
      <Router basename={basePath || ''}>
        <RemoveTrailingSlash />
        <Routes>
          <Route path="/">
            <Route index element={<AuthIndicator />} />
            <Route path="login" element={<Login />} />
            <Route path="rpc" element={<RpcRoute />} />
            <Route path="create-account" element={<CreateAccount />} />
            <Route path="add-device" element={<AddDevice />} />
            {/* TODO: change the path for the delegates it's a breaking change that need to be done in sync with integrators */}
            <Route path="sign" element={<SignTemplate signMethod="delegate" />} />
            <Route path="sign-transaction" element={<SignTemplate signMethod="transaction" />} />
            <Route path="sign-message" element={<SignMessage />} />
            {/* TODO: This isn't available on mainnet, and isn't production ready, clean the code for production release */}
            {environment.NETWORK_ID === 'testnet' && <Route path="sign-multichain" element={<SignMultichain />} />}
            <Route path="verify-email" element={<VerifyEmailPage />} />
            <Route path="verify-otp" element={<VerifyOtpPage />} />
            <Route path="auth-callback" element={<AuthCallbackPage />} />
            <Route path="devices" element={<Devices />} />
          </Route>
        </Routes>
      </Router>
    </>
  );
}
