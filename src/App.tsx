import debug from 'debug';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';

import AddDevice from './components/AddDevice/AddDevice';
import AuthIndicator from './components/AuthIndicator/AuthIndicator';
import CreateAccount from './components/CreateAccount/CreateAccount';
import Devices from './components/Devices/Devices';
import Layout from './components/Layout/Layout';
import Sign from './components/Sign/Sign';
import FastAuthController from './lib/controller';
import GlobalStyle from './styles';

(window as any).fastAuthController = new FastAuthController({
  accountId:        'durdopemlo.testnet',
  networkId:        'testnet',
  oidcToken:        'eyJhbGciOiJSUzI1NiIsImtpZCI6IjYyM2YzNmM4MTZlZTNkZWQ2YzU0NTkyZTM4ZGFlZjcyZjE1YTBmMTMiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vcGFnb2RhLW9ib2FyZGluZy1kZXYiLCJhdWQiOiJwYWdvZGEtb2JvYXJkaW5nLWRldiIsImF1dGhfdGltZSI6MTY5MDg2MTY0MSwidXNlcl9pZCI6Ik1YcnNPOEdPeHRTMVdUN0lFRVFwa3Vpd2hhdTEiLCJzdWIiOiJNWHJzTzhHT3h0UzFXVDdJRUVRcGt1aXdoYXUxIiwiaWF0IjoxNjkwODYxNjQxLCJleHAiOjE2OTA4NjUyNDEsImVtYWlsIjoiZHVyZG9wZW1sb0BndWZ1bS5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiZmlyZWJhc2UiOnsiaWRlbnRpdGllcyI6eyJlbWFpbCI6WyJkdXJkb3BlbWxvQGd1ZnVtLmNvbSJdfSwic2lnbl9pbl9wcm92aWRlciI6InBhc3N3b3JkIn19.CR1G7dz-coCsGXr1FSsCvkIv3CyR8QNf6zr3pKZN30vMqxMY9RMg3nmE3yuZPO60R1s0tuJ4-wNEJ4h_BLfb3hCoueKIqLw-O_A-Bs_-PhiNNpcnsSZNOxZoqj5gHaS_jLRmJ8VI6-Pp4ZysFYC_3vLiMOiiOWIiuc1pIaA2l_4aTmhVtc-z5elNPsb006sqli7kVf7D4fhrAiDIsXVFPRpF9lENb8MmjAsksWXO9YQpMnd5NH76H0jV-n9LSvzB3Nd72Rr37SMcLAD41G9Iq5cP9DZemZFPVQ2t_cftKQKuMzsd06z3QwY9z1OSYlfK4KBihlLeVPDZAjbEpcipJg',
  fullAccessKey:    'ed25519:4WnbxtfSgELHsjFSAH4ir5fYMk4B3dNyGB8fs8WZAintJM1Uwnk6L1ZkYi9MJTQQXebvgq7kxby1f8h9K6f1px7k',
  limitedAccessKey: {
    public_key: 'ed25519:HV3dNo3uhS5jhAoLXqMAzwjatsWEJViawEjeKpFKWRvJ', receiver_id: 'v1.social08.testnet', allowance: '250000000000000', method_names: ''
  }
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
            <Route path="add-device" element={<AddDevice controller={window.fastAuthController} />} />
            <Route path="create-account" element={<CreateAccount />} />
            <Route path="sign" element={<Sign />} />
            <Route path="devices" element={<Devices controller={window.fastAuthController} />} />
          </Route>
        </Routes>
      </Router>
      <h1>{t('main.title')}</h1>
      <button type="button" onClick={() => i18n.changeLanguage('de')}>de</button>
      <button type="button" onClick={() => i18n.changeLanguage('en')}>en</button>
      <p>{t('main.titleDesc')}</p>
      {/* TEST CODE DELETE LATER */}
      <button type="button" onClick={() => window.fastAuthController.claimOidcToken()}>Claim OIDC Token</button>
      <button type="button" onClick={() => window.fastAuthController.getUserCredential()}>GET USER CREDENTIAL</button>
    </>
  );
}
