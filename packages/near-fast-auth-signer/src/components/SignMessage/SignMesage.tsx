import React, { useCallback, useRef, useState } from 'react';

import { Message } from './SignMessage.styles';
import useIframeDialogConfig from '../../hooks/useIframeDialogConfig';
import { IframeRequestEvent, useIframeRequest } from '../../hooks/useIframeRequest';
import InternetSvg from '../../Images/Internet';
import ModalIconSvg from '../../Images/ModalIcon';
import { Button } from '../../lib/Button';
import { ModalSignWrapper } from '../Sign/Sign.styles';
import TableContent from '../TableContent/TableContent';

// Keep it in sync with wallet selector type: https://github.com/near/wallet-selector/blob/ae7f7acb7a0696554afdaf1909004e0ec0c4b645/packages/core/src/lib/wallet/wallet.types.ts#L83
export interface SignMessageParams {
  message: string;
  recipient: string;
  nonce: Buffer;
  callbackUrl?: string;
  state?: string;
}

function SignMessage() {
  const signTransactionRef = useRef(null);
  useIframeDialogConfig({
    element: signTransactionRef.current,
    onClose: () => window.parent.postMessage({ type: 'method', message: 'User cancelled action' }, '*')
  });
  const [inFlight, setInFlight] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState<string | null>(null);
  const [data, setData] = useState<SignMessageParams | null>(null);

  const iframeEventHandler = useCallback((event: IframeRequestEvent<SignMessageParams>) => {
    setOrigin(event.origin);
    setData(event.data.data);
  }, []);

  useIframeRequest<SignMessageParams>({
    eventType: {
      loaded:  'signMessageLoaded',
      request: 'signMessageRequest',
    },
    eventHandler: iframeEventHandler,
  });

  const onConfirm = useCallback(() => {
    setInFlight(true);
    console.log(data);
  }, [data]);

  const onCancel = useCallback(() => {
    window.parent.postMessage({ type: 'method', message: 'User cancelled action', closeIframe: true }, '*');
  }, []);

  return (
    <ModalSignWrapper ref={signTransactionRef}>
      <div className="modal-body">
        <div className="modal-top">
          <ModalIconSvg />
          <h3>Signature Request</h3>
          <div className="transaction-details">
            <InternetSvg />
            {origin}
          </div>
        </div>
        <div className="modal-middle">
          <div className="table-wrapper">
            <TableContent
              leftSide="From"
              rightSide={data?.recipient}
            />
            <TableContent
              leftSide={(
                <Message>
                  <p className="title">Message</p>
                  <p className="message">{data?.message}</p>
                </Message>
              )}
            />
          </div>
        </div>
        <Button
          variant="primary"
          size="large"
          label={inFlight ? 'Loading...' : 'Approve'}
          onClick={onConfirm}
          disabled={inFlight}
        />
        <Button
          variant="secondary"
          fill="ghost"
          size="large"
          label="Cancel"
          onClick={onCancel}
          disabled={inFlight}
        />
        {error && <p className="info-text error">{error}</p>}
      </div>
    </ModalSignWrapper>
  );
}

export default SignMessage;
