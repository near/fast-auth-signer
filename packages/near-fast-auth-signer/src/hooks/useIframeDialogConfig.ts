import { useCallback, useEffect } from 'react';

import { inIframe } from '../utils';

// Define the return type for the hook
type HookReturnType = {
  // eslint-disable-next-line no-unused-vars
  sendDialogHeight: (domElement?: HTMLElement) => void;
};

// Define configuration options for the hook
type ConfigOptions = {
  source?: string;
  // Containing element in the iframe
  element?: HTMLElement;
  onClose?: () => void;
};

/**
 * Custom hook to configure and handle the behavior of an iframe modal.
 * @param {ConfigOptions} options - Configuration options for the hook.
 * @returns {HookReturnType} An object containing the function to send the iframe height.
 */
const useIframeDialogConfig = (options: ConfigOptions): HookReturnType => {
  const { element, onClose, source } = options;

  /**
   * Callback function to send the iframe height to the parent window.
   * @param {HTMLElement} domElement - Optional parameter to specify the target element.
   */
  const sendDialogHeight = useCallback((domElement?: HTMLElement) => {
    // Check if the component is rendered inside an iframe
    if (!inIframe()) return;

    const el = domElement ?? element;

    // Check if the element exists
    if (el) {
      // Get the height of the element
      const dialogHeight = el.offsetHeight;
      const data = { dialogHeight } as Record<string, unknown>;
      if (source) data.source = source;
      if (onClose) data.onClose = onClose.toString();
      // Send the height, onClose, and source to the parent window
      window.parent.postMessage(data, '*');
    }
  }, [element, onClose, source]);

  // Effect to send iframe height on mount and when the sendIframeHeight function changes
  useEffect(() => {
    sendDialogHeight();
  }, [sendDialogHeight]);

  // Return the function to send the dialog (iframe) height
  return { sendDialogHeight };
};

export default useIframeDialogConfig;
