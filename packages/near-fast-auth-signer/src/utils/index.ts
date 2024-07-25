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
    const decodedVal = decodeURIComponent(paramVal);

    // Check if the decoded value is different and contains percent-encoded characters
    if (decodedVal !== paramVal) {
      return decodeIfTruthy(decodedVal);
    }

    return decodedVal;
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

export const assertNever = (x: never, customErrorMessage?: string): never => {
  throw new Error(customErrorMessage || `Unexpected object: ${x}`);
};

// Use this function to implement wait logic for async process
export const withTimeout = async (promise, timeoutMs) => {
  // Create a promise that resolves with false after timeoutMs milliseconds
  const timeoutPromise = new Promise((resolve) => { setTimeout(() => resolve(false), timeoutMs); });

  // Race the input promise against the timeout
  return Promise.race([promise, timeoutPromise]);
};

export const isSafari = () => /^((?!chrome|android).)*safari/i
  .test(navigator.userAgent);

type ExtractQueryParamsOptions = {
  decode?: boolean;
  allowNull?: boolean;
}
// Generic function to extract query parameters
export const extractQueryParams = <T extends string>(
  searchParams: URLSearchParams, // The URLSearchParams object containing the query parameters
  paramNames: T[], // An array of parameter names to extract
  options: ExtractQueryParamsOptions = { decode: true } // Optional settings for decoding and allowing null values
): { [K in T]: string } => { // The return type is an object with keys from paramNames and values of type string or null
  const { decode, allowNull } = options || {}; // Destructure the options with default values
  const params = {} as { [K in T]: string }; // Initialize the params object with the correct type

  // Iterate over the parameter names
  paramNames.forEach((paramName) => {
    // Get the parameter value and decode it if necessary
    const paramValue = decode ? decodeIfTruthy(searchParams.get(paramName)) : searchParams.get(paramName);
    // If the parameter value is not null or if null values are allowed, add it to the params object
    if (paramValue !== null || allowNull) {
      params[paramName] = paramValue;
    }
  });

  // Return the params object
  return params;
};
