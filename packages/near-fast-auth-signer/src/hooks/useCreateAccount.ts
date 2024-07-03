import { sendSignInLinkToEmail } from 'firebase/auth';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { openToast } from '../lib/Toast';
import { recordEvent } from '../utils/analytics';
import { basePath, network } from '../utils/config';
import { firebaseAuth } from '../utils/firebase';

export const createFirebaseAccount = async ({
  accountId, email, isRecovery, success_url, failure_url, public_key, contract_id, methodNames
}) => {
  const searchParams = new URLSearchParams({
    ...(accountId ? { accountId } : {}),
    ...(isRecovery ? { isRecovery } : {}),
    ...(success_url ? { success_url } : {}),
    ...(failure_url ? { failure_url } : {}),
    ...(public_key ? { public_key_lak: public_key } : {}),
    ...(contract_id ? { contract_id } : {}),
    ...(methodNames ? { methodNames } : {})
  });

  await sendSignInLinkToEmail(firebaseAuth, email, {
    url: encodeURI(
      `${window.location.origin}${basePath ? `/${basePath}` : ''}/auth-callback?${searchParams.toString()}`,
    ),
    handleCodeInApp: true,
  });
  window.localStorage.setItem('emailForSignIn', email);
  return {
    accountId,
  };
};
export type CreateAccountFormValues = {
 email: string;
 username: string;
}

type ReturnProps = {
  createAccount(values: CreateAccountFormValues): void;
  loading: boolean
}

export const useCreateAccount = (): ReturnProps => {
  const [searchParams] = useSearchParams();

  const [inFlight, setInFlight] = useState(false);
  recordEvent('click-signup-continue');
  const success_url = searchParams.get('success_url');
  const failure_url = searchParams.get('failure_url');
  const public_key =  searchParams.get('public_key');
  const methodNames = searchParams.get('methodNames');
  const contract_id = searchParams.get('contract_id');
  console.log('useCreateAccount HOOK');
  const createAccount = async (data: CreateAccountFormValues) => {
    setInFlight(true);
    try {
      const fullAccountId = `${data.username}.${network.fastAuth.accountIdSuffix}`;
      const {
        accountId
      } = await createFirebaseAccount({
        accountId:  fullAccountId,
        email:      data.email,
        isRecovery: false,
        success_url,
        failure_url,
        public_key,
        contract_id,
        methodNames,
      });
      const newSearchParams = new URLSearchParams({
        accountId,
        email:      data.email,
        isRecovery: 'false',
        ...(success_url ? { success_url } : {}),
        ...(failure_url ? { failure_url } : {}),
        ...(public_key ? { public_key_lak: public_key } : {}),
        ...(contract_id ? { contract_id } : {}),
        ...(methodNames ? { methodNames } : {})
      });
      window.parent.postMessage({
        type:   'method',
        method: 'query',
        id:     1234,
        params: {
          request_type: 'complete_authentication',
        }
      }, '*');
      window.open(`${window.location.origin}${basePath ? `/${basePath}` : ''}/verify-email?${newSearchParams.toString()}`, '_parent');
      // navigate(`/verify-email?${newSearchParams.toString()}`);
    } catch (error: any) {
      recordEvent('signup-error', { errorMessage: error.message });
      console.log('error', error);

      window.parent.postMessage({
        type:    'CreateAccountError',
        message: typeof error?.message === 'string' ? error.message : 'Something went wrong'
      }, '*');

      openToast({
        type:  'ERROR',
        title: error.message,
      });
      // redirectWithError({ success_url, failure_url, error });
      // currently running handleCreateAccount() will throw an error as:
      // error DOMException: The following credential operations can only occur in a document which is same-origin with all of its ancestors: storage/retrieval of 'PasswordCredential' and 'FederatedCredential', storage of 'PublicKeyCredential'.

      // TODO: Need to either fix the logic above or handle a different way
      // const message = errorMessages[error.code] || error.message;
      // const parsedUrl = new URL(failure_url || success_url || window.location.origin);
      // parsedUrl.searchParams.set('code', error.code);
      // parsedUrl.searchParams.set('reason', message);
      // window.location.replace(parsedUrl.href);
      // openToast({
      //   type:  'ERROR',
      //   title: message,
      // });
    } finally {
      setInFlight(false);
    }
  };
  return { loading: inFlight, createAccount };
};
