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
