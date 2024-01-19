import { useCallback, useEffect, useState } from 'react';

import { inIframe } from '../utils';

type HookReturnType = {
  sendDialogHeight(): void;
};

type ConfigOptions = {
  source?: string;
  element: HTMLElement;
  onClose?: () => void;
};

const useIframeDialogConfig = ({ element, onClose, source }: ConfigOptions): HookReturnType => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Set component as mounted to make sure element is available in DOM
    setIsMounted(true);
  }, []);

  const sendDialogHeight = useCallback(() => {
    if (!inIframe() || !isMounted) return;
    if (element) {
      const dialogHeight = element.offsetHeight;
      const data = { dialogHeight } as Record<string, unknown>;
      if (source) data.source = source;
      if (onClose) data.onClose = onClose.toString();
      window.parent.postMessage(data, '*');
    }
  }, [element, isMounted, onClose, source]);

  useEffect(() => {
    sendDialogHeight();
  }, [sendDialogHeight]);

  return { sendDialogHeight };
};

export default useIframeDialogConfig;
