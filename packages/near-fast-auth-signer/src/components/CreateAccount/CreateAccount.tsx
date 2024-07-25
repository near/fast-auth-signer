import * as React from 'react';
import {
  useRef
} from 'react';

import CreateAccountForm from './CreateAccountForm';
import { useCreateAccount } from '../../hooks/useCreateAccount';
import useIframeDialogConfig from '../../hooks/useIframeDialogConfig';
import { useInvalidContractId } from '../../hooks/useInvalidContractId';
import { inIframe } from '../../utils';
import { StyledContainer } from '../Layout';
import { getMultiChainContract } from '../SignMultichain/utils';

function CreateAccount() {
  const createAccountFormRef = useRef(null);
  // Send form height to modal if in iframe
  useIframeDialogConfig({ element: createAccountFormRef.current });

  useInvalidContractId(getMultiChainContract(), 'CreateAccountError');

  const { createAccount, loading: inFlight } = useCreateAccount();

  return (
    <StyledContainer inIframe={inIframe()}>
      <CreateAccountForm
        ref={createAccountFormRef}
        onSubmit={createAccount}
        loading={inFlight}
      />
    </StyledContainer>
  );
}

export default CreateAccount;
