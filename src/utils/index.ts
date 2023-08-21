/* eslint-disable import/prefer-default-export */
export function inIframe() {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}
