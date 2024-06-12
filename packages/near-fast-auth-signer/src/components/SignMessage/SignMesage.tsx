import { serialize } from 'near-api-js/lib/utils/serialize';
import React, { useCallback, useRef, useState } from 'react';

import { Message } from './SignMessage.styles';
import { getAuthState } from '../../hooks/useAuthState';
import useIframeDialogConfig from '../../hooks/useIframeDialogConfig';
import { IframeRequestEvent, useIframeRequest } from '../../hooks/useIframeRequest';
import InternetSvg from '../../Images/Internet';
import ModalIconSvg from '../../Images/ModalIcon';
import { Button } from '../../lib/Button';
import { ModalSignWrapper } from '../Sign/Sign.styles';
import TableContent from '../TableContent/TableContent';

const RESPONSE_TYPE = 'signMessageResponse';

// Keep it in sync with wallet selector type: https://github.com/near/wallet-selector/blob/ae7f7acb7a0696554afdaf1909004e0ec0c4b645/packages/core/src/lib/wallet/wallet.types.ts#L83
export interface SignMessageParams {
  message: string;
  recipient: string;
  nonce: Buffer;
  callbackUrl?: string;
  state?: string;
}

class Payload {
  tag: number;

  message: string;

  nonce: number[];

  recipient: string;

  constructor({
    message, nonce, recipient
  }: Payload) {
    this.tag = 2147484061;
    Object.assign(this, {
      message, nonce, recipient
    });
  }
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

  const onConfirm = useCallback(async () => {
    try {
      if (!data) {
        throw new Error('No data received');
      }

      if (data.nonce.byteLength !== 32) {
        throw Error('Expected nonce to be a 32 bytes buffer');
      }

      setInFlight(true);
      setError(null);
      setInFlight(true);
      const isUserAuthenticated = await getAuthState();
      if (isUserAuthenticated !== true) {
        const errorMessage = 'You are not authenticated or there has been an indexer failure';
        setError(errorMessage);
        window.parent.postMessage({ type: RESPONSE_TYPE, message: errorMessage, closeIframe: true }, '*');
        setInFlight(false);
        return;
      }

      const payload = new Payload({
        tag: 2147484061, message: data.message, nonce: Array.from(data.nonce), recipient: data.recipient
      });

      const schema = new Map([[Payload, { kind: 'struct', fields: [['tag', 'u32'], ['message', 'string'], ['nonce', ['u8']], ['recipient', 'string']] }]]);
      const borshPayload = serialize(schema, payload);

      const { signature, publicKey, accountId } = await window.fastAuthController.signMessage(borshPayload);

      window.parent.postMessage({
        type: RESPONSE_TYPE,
        data: {
          signature: Buffer.from(signature).toString('base64'),
          publicKey,
          accountId,
          state:     data.state
        },
        closeIframe: true
      }, '*');
    } catch (e) {
      setError(e.message);
      window.parent.postMessage({ type: RESPONSE_TYPE, message: e.message, closeIframe: true }, '*');
    } finally {
      setInFlight(false);
    }
  }, [data]);

  const onCancel = useCallback(() => {
    window.parent.postMessage({ type: RESPONSE_TYPE, message: 'User cancelled action', closeIframe: true }, '*');
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
