import { KeyPair } from 'near-api-js';
import { Page } from 'playwright/test';

const setupPasskeys = ({
  isPassKeyAvailable = true,
  returnSameKey = true,
  secretKeyA,
  secretKeyB,
}) => {
  const createKeyPair = secretKeyA;
  const getKeyPair = returnSameKey ? createKeyPair : secretKeyB;

  // @ts-ignore
  window.test = {
    isPassKeyAvailable: async () => isPassKeyAvailable,
    createKey:          () => createKeyPair,
    getKeys:            () => [getKeyPair, getKeyPair],
  };
};

export const setupPagePasskeys = async (page: Page, config: {
  isPassKeyAvailable: boolean;
  returnSameKey: boolean;
  keyPairA: KeyPair;
  keyPairB: KeyPair;
}) => {
  await page.addInitScript(
    setupPasskeys,
    {
      ...config,
      // Using any to access private property
      secretKeyA: (config.keyPairA as any).secretKey,
      secretKeyB: (config.keyPairB as any).secretKey
    }
  );
};

export const setupIFramePasskeys = async (page: Page, config: {
  isPassKeyAvailable: boolean;
  returnSameKey: boolean;
  keyPairA: KeyPair;
  keyPairB: KeyPair;
}) => {
  await new Promise<void>((resolve) => {
    page.on('frameattached', async (frame) => {
      await frame.evaluate(
        setupPasskeys,
        {
          ...config,
          // Using any to access private property
          secretKeyA: (config.keyPairA as any).secretKey,
          secretKeyB: (config.keyPairB as any).secretKey
        }
      );
      resolve();
    });
  });
};
