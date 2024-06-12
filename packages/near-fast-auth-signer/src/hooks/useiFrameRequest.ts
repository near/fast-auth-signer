import { useEffect } from 'react';

/**
 * Custom hook to handle iframe requests.
 *
 * This hook sets up an event listener for messages from an iframe and handles
 * the communication between the parent window and the iframe. It listens for
 * specific event types and triggers the provided event handler when a matching
 * event is received.
 *
 * @template T - The type of data expected in the event handler.
 * @param {Object} args - The arguments for the hook.
 * @param {Object} args.eventType - The event types to listen for.
 * @param {string} args.eventType.loaded - The event type indicating the iframe has loaded.
 * @param {string} args.eventType.request - The event type for incoming requests.
 * @param {Function} args.eventHandler - The event handler function to be called when a matching event is received.
 *
 * @example
 * useIframeRequest({
 *   eventType: {
 *     loaded: 'iframeLoaded',
 *     request: 'iframeRequest',
 *   },
 *   eventHandler: (data) => {
 *     console.log('Received data:', data);
 *   },
 * });
 *
 * @note The eventHandler function must be memoized.
 */

export type IframeRequestEvent<D> = MessageEvent<{
  type: string;
  data: D;
}>;

export const useIframeRequest = <D>(
  args: {
    eventType: {
      loaded: string,
      request: string,
    }
    eventHandler: (_data: IframeRequestEvent<D>) => void;
  }
) => {
  useEffect(() => {
    const handleMessage = async (event: IframeRequestEvent<D>) => {
      if (event.data.type === args.eventType.request && event?.data?.data) {
        args.eventHandler(event);
      }
    };

    window.addEventListener(
      'message',
      handleMessage,
    );

    window.parent.postMessage({ type: args.eventType.loaded }, '*');

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  // Do not add args to dependencies as the object reference will change every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [args.eventHandler, args.eventType.loaded, args.eventType.request]);
};
