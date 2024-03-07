import { borshDeserialize } from 'borsher';
import React, {
  useEffect, useState, useCallback, useRef
} from 'react';

import { derivationPathSchema } from './schema';
import { DerivationPathDeserialized, MultichainIframeMessage } from './types';
import {
  validateMessage,
  getSignedDelegateBase64,
  getTokenAndTotalPrice,
  multichainAssetToNetworkName,
  shortenAddress,
  getGasFee
} from './utils';
import { getAuthState } from '../../hooks/useAuthState';
import useFirebaseUser from '../../hooks/useFirebaseUser';
import useIframeDialogConfig from '../../hooks/useIframeDialogConfig';
import InternetSvg from '../../Images/Internet';
import ModalIconSvg from '../../Images/ModalIcon';
import { Button, CloseButton } from '../../lib/Button';
import { ModalSignWrapper } from '../Sign/Sign.styles';
import TableContent from '../TableContent/TableContent';
import { TableRow } from '../TableRow/TableRow';

// TODO: Delete after demo
const sampleMessageForEthereum: MultichainIframeMessage = {
  nearAccountId:    'osman.testnet',
  chainId:          BigInt('5'),
  derivationPath:   'AwAAAEVUSAAXAAAAdGVzdC1tY2hhaW4tZTJlLnRlc3RuZXQ=',
  to:               '0x47bF16C0e80aacFf796E621AdFacbFaaf73a94A4',
  value:            BigInt('10000000000000000')
};

function SignMultichain() {
  const { loading: firebaseUserLoading, user: firebaseUser } = useFirebaseUser();
  const signTransactionRef = useRef(null);
  const [amountInfo, setAmountInfo] = useState<{ price: string | number, tokenAmount: string | number }>({ price: '...', tokenAmount: 0 });
  const [message, setMessage] = useState<MultichainIframeMessage>(null);
  const [inFlight, setInFlight] = useState(false);
  const [error, setError] = useState(null);
  const [deserializedDerivationPath, setDeserializedDerivationPath] = useState<DerivationPathDeserialized>(null);

  // Send form height to modal if in iframe
  useIframeDialogConfig({
    element: signTransactionRef.current,
    onClose: () => window.parent.postMessage({ type: 'method', message: 'User cancelled action' }, '*')
  });

  const onError = (text: string) => {
    window.parent.postMessage({ type: 'multichainError', message: text }, '*');
    setError(text);
  };

  // event listener setup
  useEffect(() => {
    const handleMessage = (event) => {
      console.log('event', event);
      // Maybe add origin check here? if url of origin is available, maybe update below
      console.log('Message received in iframe: ', event.data);
      if (event.data.data) {
        setMessage(event.data.data);
      }
    };

    window.addEventListener(
      'message',
      handleMessage,
    );
    // TODO: test code, delete later
    console.log('set temp message');
    setMessage(sampleMessageForEthereum);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // when we have message and price is not set, retrieve price info
  useEffect(() => {
    if (message === null) return;

    if (message !== null && !('derivationPath' in message)) {
      onError('derivationPath is missing');
      return;
    }

    const init = async () => {
      const deserialize: DerivationPathDeserialized = borshDeserialize(derivationPathSchema, Buffer.from(message.derivationPath, 'base64'));
      const validation = await validateMessage(message, deserialize.asset);
      if (!validation) {
        return onError(validation.toString());
      }
      setDeserializedDerivationPath(deserialize);
      const { tokenAmount, tokenPrice } = await getTokenAndTotalPrice(deserialize.asset, message.value);
      const transactionCost = await getGasFee({
        asset:          deserialize.asset,
        message,
        usdCostOfToken: tokenPrice,
      });
      setAmountInfo({
        price: transactionCost,
        tokenAmount,
      });
      return setInFlight(false);
    };

    try {
      if (!amountInfo.tokenAmount && message) {
        setInFlight(true);
        init();
      }
    } catch (e) {
      console.error('Error in init', e);
    }
  }, [message, amountInfo.tokenAmount]);

  const signDelegate = useCallback(async () => {
    setError(null);
    setInFlight(true);
    try {
      const controller = window.fastAuthController;
      const publicKey = await controller.getPublicKey();
      const signedDelegateBase64 = await getSignedDelegateBase64({
        najPublicKeyStr:            publicKey,
        message,
        deserializedDerivationPath,
      });
      console.log('signedDelegateBase64', signedDelegateBase64);
      window.parent.postMessage({ type: 'response', signedDelegates: signedDelegateBase64 }, '*');
      setInFlight(false);
    } catch (e) {
      setInFlight(false);
      throw new Error('Failed to sign delegate');
    }
  }, [deserializedDerivationPath, message]);

  // If domain info passed from derivation path is same as window.parent.orgin, post message to parent directly
  useEffect(() => {
    if (deserializedDerivationPath?.domain === window.parent.origin) {
      signDelegate();
    }
  }, [deserializedDerivationPath?.domain, signDelegate]);

  const onConfirm = async () => {
    setError(null);
    setInFlight(true);
    const isUserAuthenticated = await getAuthState(firebaseUser?.email);
    if (isUserAuthenticated !== true) {
      const errorMessage = 'You are not authenticated or there has been an indexer failure';
      onError(errorMessage);
      setInFlight(false);
      return;
    }
    await signDelegate();
  };

  const onCancel = () => {
    window.parent.postMessage({ type: 'method', message:  'User cancelled action' }, '*');
  };

  return (
    <ModalSignWrapper ref={signTransactionRef}>
      <CloseButton onClick={onCancel} />
      <div className="modal-top">
        <ModalIconSvg />
        <h3>Approve Transaction?</h3>
        <h5>{`${deserializedDerivationPath?.domain || 'Unknown App'} has requested a transaction, review the request before confirming.`}</h5>
        <div className="transaction-details">
          <InternetSvg />
          {window.parent.origin || 'Unknown App'}
        </div>
      </div>
      <div className="modal-middle">
        <div className="table-wrapper">
          <TableContent
            leftSide="Details"
            rightSide={(
              <TableRow
                content={`${amountInfo.tokenAmount ? `Send ${amountInfo.tokenAmount} ${deserializedDerivationPath?.asset}` : '...'}`}
              />
            )}
          />
          <TableContent
            leftSide="to"
            rightSide={(
              <TableRow
                asset={deserializedDerivationPath?.asset}
                content={<b><span title={message?.to || ''}>{`${shortenAddress(message?.to || '...')}`}</span></b>}
              />
            )}
          />
          <TableContent
            leftSide="Network"
            rightSide={(
              <TableRow
                asset={deserializedDerivationPath?.asset}
                content={multichainAssetToNetworkName(deserializedDerivationPath?.asset)}
              />
            )}
          />
        </div>
        <div className="table-wrapper margin-top">
          <TableContent
            leftSide="Estimated Fees"
            infoText="The estimated total of your transaction including fees."
            rightSide={`${typeof amountInfo?.price === 'number' ? `$${amountInfo.price}` : '...'}`}
          />
        </div>
      </div>
      <div className="modal-footer">
        <Button
          variant="affirmative"
          size="large"
          label={inFlight ? 'Loading...' : 'Approve'}
          onClick={onConfirm}
          disabled={!amountInfo.price || inFlight}
        />
      </div>
      {!firebaseUserLoading && !firebaseUser && <p className="info-text">You are not authenticated!</p>}
      {error && <p className="info-text error">{error}</p>}
    </ModalSignWrapper>
  );
}

export default SignMultichain;
