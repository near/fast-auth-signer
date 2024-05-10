export const setupPasskeys = () => {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/near-api-js@2.1.4/dist/near-api-js.min.js';
  document.head.appendChild(script);
  const seed = '5aWQVZ29KNZYFPFD8WA3qzUjmRWkH7RioPevVzB82EHfuKSVXCBzer5eTwnpKYnd6XKfEv97AdiRw1xA3MVYsY6g';

  // Keypair imported from near-api-js CDN
  // @ts-ignore
  window.test = {
    isPassKeyAvailable: async () => true,
    // @ts-ignore
    // eslint-disable-next-line no-undef
    createKey:          async () => window.nearApi.KeyPair.fromString(seed),
    // @ts-ignore
    // eslint-disable-next-line no-undef
    getKeys:            async () => [window.nearApi.KeyPair.fromString(seed), window.nearApi.KeyPair.fromString(seed)],
  };
};
