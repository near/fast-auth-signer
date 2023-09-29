import { useEffect } from 'react';


function RpcRoute() {
  useEffect(() => {
    const listener = (e: MessageEvent) => {
      if (e.data.type === 'method' && e.data.params) {
        // eslint-disable-next-line default-case
        switch (e.data.params.request_type) {
          case 'get_pre_biometric_auth_account':
            window.parent.postMessage({
              type:   'response',
              id:     e.data.id,
              result: window.localStorage.getItem('webauthn_username')
            }, '*');
            break;
        }
      }
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, []);

  return null;
}

export default RpcRoute;
