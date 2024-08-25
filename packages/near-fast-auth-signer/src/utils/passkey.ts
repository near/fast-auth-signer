import { createKey, isPassKeyAvailable } from '@near-js/biometric-ed25519';

export const storePassKeyAsFAK = async (email: string): Promise<string | null> => {
  if (await isPassKeyAvailable()) {
    const keyPair = await createKey(email);
    await window.fastAuthController.setKey(keyPair);
    return keyPair.getPublicKey().toString();
  }
  return null;
};
