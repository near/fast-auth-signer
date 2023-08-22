import debug from 'debug';
import * as React from 'react';
import {
  Navigate, Route, BrowserRouter as Router, Routes, useLocation
} from 'react-router-dom';

import AddDevice from './components/AddDevice/AddDevice';
import AuthCallbackPage from './components/AuthCallback/AuthCallback';
import AuthIndicator from './components/AuthIndicator/AuthIndicator';
import CreateAccount from './components/CreateAccount/CreateAccount';
import Login from './components/Login/Login';
import Sign from './components/Sign/Sign';
import VerifyEmailPage from './components/VerifyEmail/verify-email';
import FastAuthController from './lib/controller';
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

  return (
    <>
      {/* <GlobalStyle /> */}
      <Router>
        <RemoveTrailingSlash />
        <Routes>
          <Route path="/">
            <Route index element={<AuthIndicator controller={window.fastAuthController} />} />
            <Route path="add-device" element={<AddDevice />} />
            <Route path="create-account" element={<CreateAccount />} />
            <Route path="sign" element={<Sign />} />
            <Route path="verify-email" element={<VerifyEmailPage />} />
            <Route path="login" element={<Login controller={window.fastAuthController} />} />
            <Route path="auth-callback" element={<AuthCallbackPage />} />
          </Route>
        </Routes>
      </Router>
    </>
  );
}
