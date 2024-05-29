import { KeyPair } from 'near-api-js';
import { Page } from 'playwright/test';

const configWindowTest = ({
  isPassKeyAvailable = true,
  keyCreationSecret,
  keyRetrievalSecret,
  shouldCleanStorage = false
}) => {
  if (shouldCleanStorage) {
    window.localStorage.clear();
    window.sessionStorage.clear();
  }

  // @ts-ignore
  window.test = {
    isPassKeyAvailable: async () => isPassKeyAvailable,
    ...isPassKeyAvailable ? {
      createKey:          () => keyCreationSecret,
      getKeys:            () => [keyRetrievalSecret, keyRetrievalSecret]
    } : {}
  };
};

export type SetupPasskeysFunctionsConfig = {
  isPassKeyAvailable: true;
  keyPairForCreation: KeyPair;
  keyPairForRetrieval: KeyPair;
  shouldCleanStorage: boolean;
} | {
  isPassKeyAvailable: false;
  keyPairForCreation?: never;
  keyPairForRetrieval?: never;
  shouldCleanStorage: boolean;
};

export const setupPasskeysFunctions = async (page: Page, type: 'iframe' | 'page', config: SetupPasskeysFunctionsConfig): Promise<any> => {
  const setupPasskeysArgs = {
    ...config,
    // Using any to access private property
    keyCreationSecret:  (config.keyPairForCreation as any)?.toString(),
    keyRetrievalSecret: (config.keyPairForRetrieval as any)?.toString()
  };

  if (type === 'iframe') {
    const iframeElementHandle = await page.$('#nfw-connect-iframe');
    const frame = await iframeElementHandle.contentFrame();
    await frame.evaluate(
      configWindowTest,
      setupPasskeysArgs
    );
  } else if (type === 'page') {
    await page.addInitScript(
      configWindowTest,
      setupPasskeysArgs
    );
  } else {
    throw new Error('Invalid type');
  }

  return null;
};
