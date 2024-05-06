import { KeyPair } from '@near-js/crypto';

export function createKey() {
  console.log('Mocked createKey called');
  // Use for stable KeyPair generation
  // return KeyPair.fromString('5aWQVZ29KNZYFPFD8WA3qzUjmRWkH7RioPevVzB82EHfuKSVXCBzer5eTwnpKYnd6XKfEv97AdiRw1xA3MVYsY6f');
  return KeyPair.fromRandom('ED25519');
}

export function getKeys() {
  console.log('Mocked getKeys called');
  return [
    KeyPair.fromRandom('ED25519'),
    KeyPair.fromRandom('ED25519')
  ];
}

export function isPassKeyAvailable() {
  console.log('Mocked isPassKeyAvailable called');
  return true;
}
