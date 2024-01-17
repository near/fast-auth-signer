import { basePath, network } from './config';

export function inIframe() {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}

export const decodeIfTruthy = (paramVal) => {
  if (paramVal) {
    return decodeURIComponent(paramVal);
  }

  return paramVal;
};

export const redirectWithError = ({
  failure_url,
  success_url,
  error
}: { failure_url: string | null ; success_url: string | null; error: Error }): void => {
  const { message } = error;
  const parsedUrl = new URL(failure_url || success_url || window.location.origin + (basePath ? `/${basePath}` : ''));
  parsedUrl.searchParams.set('reason', message);
  window.location.replace(parsedUrl.href);
};

/**
 * Safely retrieves a value from local storage.
 * If the retrieval fails (e.g., due to a SecurityError when the localStorage is not accessible),
 * it will return undefined.
 *
 * @param {string} key - The key of the item to retrieve from local storage.
 * @returns {string | undefined} The retrieved item's value, or undefined if the retrieval fails.
 */
export const safeGetLocalStorage = (key: string) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return undefined;
  }
};

export const deleteOidcKeyPairOnLocalStorage = () => {
  const itemCount = localStorage.length;
  for (let i = 0; i < itemCount; i += 1) {
    const key = localStorage.key(i);
    if (key && key.startsWith('near-api-js:keystore:oidc_keypair')) {
      console.log(`removing ${key} from localStorage`);
      localStorage.removeItem(key);
    }
  }
};

/**
 * Appends the network's accountIdSuffix to the provided username if it doesn't already have it.
 * This function is used to ensure that the username is always in the correct format for the network.
 *
 * @param {string} username - The username to which the suffix will be added.
 * @returns {string} The username with the network's accountIdSuffix appended if it wasn't already there.
 */
export const addNetworkSuffix = (username: string): string => {
  if (!username) return username;

  if (!username.endsWith(`.${network.fastAuth.accountIdSuffix}`)) {
    return `${username}.${network.fastAuth.accountIdSuffix}`;
  }

  return username;
};
