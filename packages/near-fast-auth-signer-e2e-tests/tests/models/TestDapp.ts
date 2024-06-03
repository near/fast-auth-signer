import { KeyPair } from '@near-js/crypto';

class TestDapp {
  page: any;

  constructor(page) {
    this.page = page;
  }

  async loginWithKeyPairLocalStorage(accountId: string, lakKeyPair: KeyPair, fakKeyPair: KeyPair) {
    const serializedLakKeyPair = lakKeyPair.toString();
    const fakPublicKey = fakKeyPair.getPublicKey().toString();
    const lakPublicKey = lakKeyPair.getPublicKey().toString();
    await this.page.evaluate(
      // eslint-disable-next-line no-shadow
      async ([accountId, serializedLakKeyPair, lakPublicKey, fakPublicKey]) => {
        window.localStorage.setItem(`near-api-js:keystore:${accountId}:testnet`, serializedLakKeyPair);
        window.localStorage.setItem('near_app_wallet_auth_key', JSON.stringify({ accountId, allKeys: [lakPublicKey, fakPublicKey] }));
      },
      [accountId, serializedLakKeyPair, lakPublicKey, fakPublicKey]
    );
  }
}

export { TestDapp };
