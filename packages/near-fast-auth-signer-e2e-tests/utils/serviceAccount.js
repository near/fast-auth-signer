export const serviceAccount = {
  type:                        'service_account',
  project_id:                  'pagoda-oboarding-dev',
  private_key_id:              process.env.FIREBASE_PRIVATE_KEY_ID_TESTNET,
  private_key:                 Buffer.from(process.env.FIREBASE_PRIVATE_KEY_TETNET, 'base64').toString('utf-8') || '',
  client_email:                process.env.FIRESBASE_CLIENT_EMAIL_TESTNET,
  client_id:                   process.env.FIRESBASE_CLIENT_ID_TESTNET,
  auth_uri:                    'https://accounts.google.com/o/oauth2/auth',
  token_uri:                   'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url:        process.env.FIRESBASE_CLIENT_CERT_TESTNET,
  universe_domain:             'googleapis.com'
};
