import { KeyPair } from 'near-api-js';

export async function createKey() {
  // @ts-ignore
  return KeyPair.fromString(window.test.createKey());
}

export async function getKeys() {
  // @ts-ignore
  return window.test.getKeys().map((k) => KeyPair.fromString(k));
}

export async function isPassKeyAvailable() {
  // @ts-ignore
  return window.test.isPassKeyAvailable();
}
