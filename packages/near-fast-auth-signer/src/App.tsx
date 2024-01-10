import debug from 'debug';
import React from 'react';
import {
  Navigate, Route, BrowserRouter as Router, Routes, useLocation
} from 'react-router-dom';

import AddDevice from './components/AddDevice/AddDevice';
import AuthCallbackPage from './components/AuthCallback/AuthCallback';
import AuthIndicator from './components/AuthIndicator/AuthIndicator';
import CreateAccount from './components/CreateAccount/CreateAccount';
import Devices from './components/Devices/Devices';
import Login from './components/Login/Login';
import RpcRoute from './components/RpcRoute/RpcRoute';
import Sign from './components/Sign/Sign';
import VerifyEmailPage from './components/VerifyEmail/verify-email';
import FastAuthController from './lib/controller';
import './styles/theme.css';
import './styles/globals.css';
import GlobalStyle from './styles/index';
import { basePath, networkId } from './utils/config';

(window as any).fastAuthController = new FastAuthController({
  accountId: 'harisvalj.testnet',
  networkId
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
            <Route path="sign" element={<Sign />} />
            <Route path="verify-email" element={<VerifyEmailPage />} />
            <Route path="auth-callback" element={<AuthCallbackPage />} />
            <Route path="devices" element={<Devices />} />
          </Route>
        </Routes>
      </Router>
    </>
  );
}
