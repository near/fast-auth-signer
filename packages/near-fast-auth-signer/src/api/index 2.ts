import { network } from '../utils/config';

/**
 * Fetches the account IDs associated with a given public key.
 *
 * @param publicKey - The public key to fetch the account IDs for.
 * @returns A promise that resolves to an array of account IDs.
 * @throws Will throw an error if the fetch request fails.
 */
export const fetchAccountIds = async (publicKey: string): Promise<string[]> => {
  const res = await fetch(`${network.fastAuth.authHelperUrl}/publicKey/${publicKey}/accounts`);
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  return res.json();
};
