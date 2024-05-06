import { KeyPairEd25519 } from '@near-js/crypto';

export function createKey() {
  console.log('Mocked createKey called');
  return new KeyPairEd25519('mock-secret-key');
}

export function getKeys() {
  console.log('Mocked getKeys called');
  return [
    new KeyPairEd25519('mock-secret-key-1'),
    new KeyPairEd25519('mock-secret-key-2')
  ];
}

export function isPassKeyAvailable() {
  console.log('Mocked isPassKeyAvailable called');
  return true;
}
