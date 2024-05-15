import { KeyPair } from 'near-api-js';
import { Frame, Page } from 'playwright/test';

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
    keyCreationSecret:  (config.keyPairForCreation as any)?.secretKey,
    keyRetrievalSecret: (config.keyPairForRetrieval as any)?.secretKey
  };

  if (type === 'iframe') {
    const listener = async (frame: Frame) => {
      if (!frame.isDetached()) {
        await frame.evaluate(
          configWindowTest,
          setupPasskeysArgs
        );
      }
    };
    page.on('framenavigated', listener);

    return listener;
  } if (type === 'page') {
    await page.addInitScript(
      configWindowTest,
      setupPasskeysArgs
    );
  } else {
    throw new Error('Invalid type');
  }

  return null;
};
