import { KeyPair } from 'near-api-js';
import { Page } from 'playwright/test';

export type KeyPairs = {
  creationKeypair: KeyPair;
  retrievalKeypair: KeyPair;
}

export type KeyPairsString = {
  creationKeypair: string;
  retrievalKeypair: string;
}

export const overridePasskeyFunctions = async (page: Page, keyPairs: KeyPairs): Promise<void> => {
  await page.addInitScript(
    // eslint-disable-next-line no-shadow
    (keyPairs: KeyPairsString) => {
      // @ts-ignore
      window.test = {
        isPassKeyAvailable: async () => true,
        createKey:          () => keyPairs.creationKeypair,
        getKeys:            () => [
          keyPairs.retrievalKeypair,
          keyPairs.retrievalKeypair
        ]
      };
    },
    {
      creationKeypair:  keyPairs.creationKeypair.toString(),
      retrievalKeypair: keyPairs.retrievalKeypair.toString(),
    }
  );
};
