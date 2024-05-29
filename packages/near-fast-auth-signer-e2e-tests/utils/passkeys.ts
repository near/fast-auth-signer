import { KeyPair } from 'near-api-js';
import { Page } from 'playwright/test';

export const overridePasskeyFunctions = async (page: Page, { creationKeypair, retrievalKeypair }: {
  creationKeypair: KeyPair,
  retrievalKeypair: KeyPair
}) => {
  await page.addInitScript(
    // eslint-disable-next-line no-shadow
    ([creationKeypair, retrievalKeypair]) => {
      // @ts-ignore
      window.test = {
        isPassKeyAvailable: async () => true,
        createKey:          () => creationKeypair.toString(),
        getKeys:            () => [retrievalKeypair.toString(), retrievalKeypair.toString()]
      };
    },
    [creationKeypair.toString(), retrievalKeypair.toString()]
  );
};
