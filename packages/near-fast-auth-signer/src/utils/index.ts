import { basePath } from './config';

/* eslint-disable import/prefer-default-export */
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
}: { failure_url: string; success_url: string; error: Error }): void => {
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
