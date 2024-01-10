import { useEffect } from 'react';

import { checkFirestoreReady, firebaseAuth } from '../../utils/firebase';

function RpcRoute() {
  useEffect(() => {
    const listener = async (e: MessageEvent) => {
      if (e.data.type === 'method' && e.data.params) {
        // eslint-disable-next-line default-case
        switch (e.data.params.request_type) {
          case 'get_pre_biometric_auth_account':
            try {
              let username = window.localStorage.getItem('webauthn_username');
              if (!username) {
                username = await checkFirestoreReady().then(async (isReady) => {
                  if (isReady) {
                    const oidcToken = await firebaseAuth.currentUser.getIdToken();
                    if (
                      window.fastAuthController.getLocalStoreKey(
                        `oidc_keypair_${oidcToken}`
                      )
                    ) {
                      return firebaseAuth.currentUser.email;
                    }
                    return null;
                  }
                  return null;
                });
              }
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
