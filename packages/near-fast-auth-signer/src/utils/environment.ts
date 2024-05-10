/* eslint-disable max-len */
import pickBy from 'lodash.pickby';

const windowEnv = typeof window !== 'undefined' ? pickBy((window as unknown as {env: any}).env || {}, (v) => !!v) : {};

const environment = {
  DEBUG:                                windowEnv.DEBUG || process.env.DEBUG,
  REACT_APP_BASE_PATH:                  windowEnv.REACT_APP_BASE_PATH || process.env.REACT_APP_BASE_PATH,
  NETWORK_ID:                           windowEnv.NETWORK_ID || process.env.NETWORK_ID,
  RELAYER_URL:                          windowEnv.RELAYER_URL || process.env.RELAYER_URL,
  FIREBASE_API_KEY:                     windowEnv.FIREBASE_API_KEY || process.env.FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN:                 windowEnv.FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID:                  windowEnv.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET:              windowEnv.FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID:         windowEnv.FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID:                      windowEnv.FIREBASE_APP_ID || process.env.FIREBASE_APP_ID,
  FIREBASE_MEASUREMENT_ID:              windowEnv.FIREBASE_MEASUREMENT_ID || process.env.FIREBASE_MEASUREMENT_ID,
  RELAYER_URL_TESTNET:                  windowEnv.RELAYER_URL_TESTNET || process.env.RELAYER_URL_TESTNET,
  FIREBASE_API_KEY_TESTNET:             windowEnv.FIREBASE_API_KEY_TESTNET || process.env.FIREBASE_API_KEY_TESTNET,
  FIREBASE_AUTH_DOMAIN_TESTNET:         windowEnv.FIREBASE_AUTH_DOMAIN_TESTNET || process.env.FIREBASE_AUTH_DOMAIN_TESTNET,
  FIREBASE_PROJECT_ID_TESTNET:          windowEnv.FIREBASE_PROJECT_ID_TESTNET || process.env.FIREBASE_PROJECT_ID_TESTNET,
  FIREBASE_STORAGE_BUCKET_TESTNET:      windowEnv.FIREBASE_STORAGE_BUCKET_TESTNET || process.env.FIREBASE_STORAGE_BUCKET_TESTNET,
  FIREBASE_MESSAGING_SENDER_ID_TESTNET: windowEnv.FIREBASE_MESSAGING_SENDER_ID_TESTNET || process.env.FIREBASE_MESSAGING_SENDER_ID_TESTNET,
  FIREBASE_APP_ID_TESTNET:              windowEnv.FIREBASE_APP_ID_TESTNET || process.env.FIREBASE_APP_ID_TESTNET,
  FIREBASE_MEASUREMENT_ID_TESTNET:      windowEnv.FIREBASE_MEASUREMENT_ID_TESTNET || process.env.FIREBASE_MEASUREMENT_ID_TESTNET,
  SENTRY_DSN:                           windowEnv.SENTRY_DSN || process.env.SENTRY_DSN,
  SENTRY_DSN_TESTNET:                   windowEnv.SENTRY_DSN_TESTNET || process.env.SENTRY_DSN_TESTNET,
  GIT_COMMIT_HASH:                      windowEnv.GIT_COMMIT_HASH || process.env.GIT_COMMIT_HASH,
};

export default environment;
