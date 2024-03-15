import { basePath } from './config';

export function isUrlNotJavascriptProtocol(url) {
  if (!url) {
    return true;
  }
  try {
    const urlProtocol = new URL(url).protocol;
    // eslint-disable-next-line no-script-url
    if (urlProtocol === 'javascript:') {
      console.log('Invalid URL protocol:', urlProtocol, 'URL cannot execute JavaScript');
      return false;
    }
    return true;
  } catch (error) {
    return false;
  }
}

export function inIframe() {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}

export const decodeIfTruthy = (paramVal) => {
  if (paramVal === 'true' || paramVal === 'false') return paramVal === 'true';
  if (paramVal) {
    return decodeURIComponent(paramVal);
  }

  return paramVal;
};

export const redirectWithError = ({
  failure_url,
  success_url,
  error
}: { failure_url: string; success_url: string; error: Error }): void => {
  const { message } = error;
  const validFailureUrl = isUrlNotJavascriptProtocol(failure_url) && failure_url;
  const validSuccessUrl = isUrlNotJavascriptProtocol(success_url) && success_url;
  const parsedUrl = new URL(validFailureUrl || validSuccessUrl || window.location.origin + (basePath ? `/${basePath}` : ''));
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

export const assertNever = (x: never): never => {
  throw new Error(`Unexpected object: ${x}`);
};
