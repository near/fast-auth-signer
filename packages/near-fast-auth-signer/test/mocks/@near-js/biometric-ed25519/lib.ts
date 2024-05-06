import { KeyPair } from '@near-js/crypto';

export function createKey() {
  console.log('Mocked createKey called');
  return KeyPair.fromString('5aWQVZ29KNZYFPFD8WA3qzUjmRWkH7RioPevVzB82EHfuKSVXCBzer5eTwnpKYnd6XKfEv97AdiRw1xA3MVYsY6a');
}

export function getKeys() {
  console.log('Mocked getKeys called');
  return [
    KeyPair.fromString('5aWQVZ29KNZYFPFD8WA3qzUjmRWkH7RioPevVzB82EHfuKSVXCBzer5eTwnpKYnd6XKfEv97AdiRw1xA3MVYsY6a'),
    KeyPair.fromString('5aWQVZ29KNZYFPFD8WA3qzUjmRWkH7RioPevVzB82EHfuKSVXCBzer5eTwnpKYnd6XKfEv97AdiRw1xA3MVYsY6a')
  ];
}

export function isPassKeyAvailable() {
  console.log('Mocked isPassKeyAvailable called');
  return true;
}
