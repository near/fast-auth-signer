import { useEffect } from 'react';


function RpcRoute() {
  useEffect(() => {
    const listener = (e: MessageEvent) => {
      if (e.data.type === 'method' && e.data.params) {
        // eslint-disable-next-line default-case
        switch (e.data.params.request_type) {
          case 'get_pre_biometric_auth_account':
            try {
              const username = window.localStorage.getItem('webauthn_username');
              window.parent.postMessage({
                type:   'response',
                id:     e.data.id,
                result: username
              }, '*');
            } catch (error) {
              window.parent.postMessage({
                type:   'response',
                id:     e.data.id,
                result: null,
                error:  {
                  code:    error.name,
                  message: error.message
                }
              }, '*');
            }
            break;
        }
      }
    };
    window.addEventListener('message', listener);
    window.parent.postMessage({
      type:   'method',
      method: 'ready'
    }, '*');
    return () => window.removeEventListener('message', listener);
  }, []);

  return null;
}

export default RpcRoute;
