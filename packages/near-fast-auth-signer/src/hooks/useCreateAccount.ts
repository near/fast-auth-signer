import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { sendOTP } from '../components/VerifyOtp/otp-utils';
import { openToast } from '../lib/Toast';
import { extractQueryParams } from '../utils';
import { recordEvent } from '../utils/analytics';
import { basePath, network } from '../utils/config';

const EVENT_SIGNUP_CONTINUE = 'click-signup-continue';
const EVENT_SIGNUP_ERROR = 'signup-error';
const ERROR_MESSAGE_DEFAULT = 'Something went wrong';

export type CreateAccountFormValues = {
  email: string;
  username: string;
}

type ReturnProps = {
  createAccount(values: CreateAccountFormValues): void;
  loading: boolean;
}

const handleCreateAccountError = (error) => {
  const errorMessage = typeof error?.message === 'string' ? error.message : ERROR_MESSAGE_DEFAULT;
  recordEvent(EVENT_SIGNUP_ERROR, { errorMessage });
  window.parent.postMessage({
    type:    'CreateAccountError',
    message: errorMessage,
  }, '*');

  openToast({
    type:  'ERROR',
    title: errorMessage,
  });
};

export const useCreateAccount = (): ReturnProps => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);

  const createAccount = useCallback(async (data: CreateAccountFormValues) => {
    setLoading(true);
    recordEvent(EVENT_SIGNUP_CONTINUE);

    const paramNames = ['success_url', 'failure_url', 'public_key', 'public_key_lak', 'methodNames', 'contract_id'];
    const {
      success_url: successUrl, failure_url: failureUrl, methodNames, contract_id: contractId,
      // In AuthCallbackPage public_key param is not available because it has been changed to public_key_lak
      public_key, public_key_lak
    } = extractQueryParams(searchParams, paramNames, {
      decode:    true,
      allowNull: false,
    });

    // Handle the case where public_key or public_key_lak might be used (AuthCallback page)
    const publicKey = public_key || public_key_lak;

    try {
      const accountId = `${data.username}.${network.fastAuth.accountIdSuffix}`;
      await sendOTP(data.email);

      const newSearchParams = new URLSearchParams({
        accountId,
        email:      data.email,
        isRecovery: 'false',
        ...(successUrl && { success_url: successUrl }),
        ...(failureUrl && { failure_url: failureUrl }),
        ...(publicKey && { public_key_lak: publicKey }),
        ...(contractId && { contract_id: contractId }),
        ...(methodNames && { methodNames })
      });

      window.parent.postMessage({
        type:   'method',
        method: 'query',
        id:     1234,
        params: { request_type: 'complete_authentication' },
      }, '*');

      window.open(`${window.location.origin}${basePath ? `/${basePath}` : ''}/verify-otp?${newSearchParams.toString()}`, '_parent');
    } catch (error) {
      handleCreateAccountError(error);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  return { loading, createAccount };
};
