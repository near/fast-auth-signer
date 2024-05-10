export async function createKey() {
  console.log('Mocked createKey called');
  // Use for stable KeyPair generation
  // return KeyPair.fromString('5aWQVZ29KNZYFPFD8WA3qzUjmRWkH7RioPevVzB82EHfuKSVXCBzer5eTwnpKYnd6XKfEv97AdiRw1xA3MVYsY6f');
  // @ts-ignore
  return window.test.createKey();
}

export async function getKeys() {
  console.log('Mocked getKeys called');
  // return [
  //   KeyPair.fromRandom('ED25519'),
  //   KeyPair.fromRandom('ED25519')
  // ];

  // @ts-ignore
  return window.test.getKeys();
}

export async function isPassKeyAvailable() {
  console.log('Mocked isPassKeyAvailable called');
  // @ts-ignore
  return window.test.isPassKeyAvailable();
}
