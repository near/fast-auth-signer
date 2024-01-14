import { useCallback, useEffect } from 'react';

import { inIframe } from '../utils';

type HookReturnType = {
  // eslint-disable-next-line no-unused-vars
  sendIframeHeight: (domElement?: HTMLElement) => void
}
/**
 * Custom hook to handle and send the height of an element to the parent window in an iframe.
 * @param {HTMLElement} element - The element whose height needs to be sent to the parent window.
 * @returns {Object} An object containing the function to send the iframe height.
 */
const useElementHeightForIframe = (element: HTMLElement): HookReturnType => {
  /**
   * Callback function to send the iframe height to the parent window.
   * @param {HTMLElement} domElement - Optional parameter to specify the target element.
   */
  const sendIframeHeight = useCallback((domElement?: HTMLElement) => {
    // Check if the component is rendered inside an iframe
    if (!inIframe()) return;

    const el = domElement ?? element;

    // Check if the element exists
    if (el) {
      // Get the height of the element
      const dialogHeight = el.offsetHeight;

      // Send the height to the parent window
      window.parent.postMessage({ iframeDialogHeight: dialogHeight }, '*');
    }
  }, [element]);

  // Effect to send iframe height on mount and when the sendIframeHeight function changes
  useEffect(() => {
    sendIframeHeight();
  }, [sendIframeHeight]);

  // Return the function to send the iframe height
  return { sendIframeHeight };
};

export default useElementHeightForIframe;
