import { borshDeserialize, borshSerialize } from 'borsher';
import React, {
  useEffect, useState, useCallback, useRef
} from 'react';

import { derivationPathSchema } from './schema';
import { DerivationPathDeserialized, MultichainInterface } from './types';
import {
  validateMessage,
  getTokenAndTotalPrice,
  multichainAssetToNetworkName,
  shortenAddress,
  multichainSignAndSend,
  multichainGetTotalGas
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
// eslint-disable-next-line no-unused-vars
const sampleMessageForEthereum: MultichainInterface = {
  chainId:          BigInt('5'),
  derivationPath:   'AwAAAEVUSAAXAAAAdGVzdC1tY2hhaW4tZTJlLnRlc3RuZXQ=',
  to:               '0x47bF16C0e80aacFf796E621AdFacbFaaf73a94A4',
  value:            BigInt('10000000000000000')
};

const binanceDerivationPath = borshSerialize(derivationPathSchema, { asset: 'BNB', domain: '' }).toString('base64');
// eslint-disable-next-line no-unused-vars
const sampleMessageForBinance: MultichainInterface = {
  chainId:          BigInt('97'),
  derivationPath:   binanceDerivationPath,
  to:               '0x47bF16C0e80aacFf796E621AdFacbFaaf73a94A4',
  value:            BigInt('10000000000000000')
};

const bitcoinDerivationPath = borshSerialize(derivationPathSchema, { asset: 'BTC', domain: '' }).toString('base64');
// eslint-disable-next-line no-unused-vars
const sampleMessageForBitcoin: MultichainInterface = {
  derivationPath:   bitcoinDerivationPath,
  to:               'tb1qz9f5pqk3t0lhrsuppyzrctdtrtlcewjhy0jngu',
  value:            BigInt('3000'),
  derivedPublicKey: 'abc',
  from:             'n1GBudBaFWz3HE3sUJ5mE8JqozjxGeJhLc'
};

// eslint-disable-next-line no-unused-vars
const sampleMessageForBitcoin2: MultichainInterface = {
  derivationPath:   bitcoinDerivationPath,
  to:               '0x47bF16C0e80aacFf796E621AdFacbFaaf73a94A4',
  value:            BigInt('3000'),
  derivedPublicKey: 'abc',
  fee:              123,
  utxos:            [],
  from:             'n1GBudBaFWz3HE3sUJ5mE8JqozjxGeJhLc'
};

function SignMultichain() {
  const { loading: firebaseUserLoading, user: firebaseUser } = useFirebaseUser();
  const signTransactionRef = useRef(null);
  const [amountInfo, setAmountInfo] = useState<{ price: string | number, tokenAmount: string | number }>({ price: '...', tokenAmount: 0 });
  const [message, setMessage] = useState<MultichainInterface>(null);
  const [inFlight, setInFlight] = useState(false);
  const [error, setError] = useState(null);
  const [isValid, setValid] = useState(null);
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
    setMessage(sampleMessageForBitcoin);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const deserializeDerivationPath = useCallback((path: string): DerivationPathDeserialized => {
    try {
      const deserialize: DerivationPathDeserialized = borshDeserialize(derivationPathSchema, Buffer.from(path, 'base64'));
      setDeserializedDerivationPath(deserialize);
      return deserialize;
    } catch (e) {
      onError(`fail to deserialize derivation path: ${e.message}`);
      return e;
    }
  }, []);

  // when we have message and price is not set, retrieve price info
  useEffect(() => {
    if (message === null) return;

    if (message !== null && !('derivationPath' in message)) {
      onError('derivationPath is missing');
      return;
    }

    const init = async () => {
      const deserialize = deserializeDerivationPath(message.derivationPath);
      const validation = await validateMessage(message, deserialize.asset);
      if (validation instanceof Error || !validation) {
        setValid(false);
        return onError(validation.toString());
      }
      setValid(true);
      const { tokenAmount, tokenPrice } = await getTokenAndTotalPrice(deserialize.asset, message.value);
      const totalGas = await multichainGetTotalGas({
        asset: deserialize?.asset,
        to:    message.to,
        value: message.value,
        ...('from' in message ? { from: message.from } : {}),
      });
      const gasFeeInUSD = parseFloat(totalGas.toString()) * tokenPrice;
      const transactionCost =  Math.ceil(gasFeeInUSD * 100) / 100;

      setAmountInfo({
        price: transactionCost,
        tokenAmount,
      });
      return setInFlight(false);
    };

    try {
      if (amountInfo.tokenAmount === 0 && message) {
        setInFlight(true);
        init();
      }
    } catch (e) {
      console.error('Error in init', e);
    }
  }, [message, amountInfo.tokenAmount, deserializeDerivationPath]);

  const signMultichainTransaction = useCallback(async () => {
    setError(null);
    setInFlight(true);
    if (isValid && message) {
      try {
        const response = await multichainSignAndSend({
          domain: deserializedDerivationPath?.domain,
          asset:  deserializedDerivationPath?.asset,
          to:     message?.to,
          value:  message?.value,
        });
        setInFlight(false);
        if (response.success) {
          window.parent.postMessage({ type: 'response', message: `Successfully sign and send transaction, ${response.transactionHash}` }, '*');
        } else {
          // @ts-ignore
          onError(response?.errorMessage);
        }
      } catch (e) {
        setInFlight(false);
        onError(e.message);
        throw new Error('Failed to sign delegate');
      }
    }
  }, [deserializedDerivationPath?.asset, deserializedDerivationPath?.domain, isValid, message]);

  // If domain info passed from derivation path is same as window.parent.orgin, post message to parent directly
  useEffect(() => {
    if (deserializedDerivationPath?.domain === window.parent.origin && isValid && message) {
      signMultichainTransaction();
    }
  }, [deserializedDerivationPath?.domain, isValid, message, signMultichainTransaction]);

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
    await signMultichainTransaction();
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
          disabled={inFlight || !isValid || typeof amountInfo.price !== 'number'}
        />
      </div>
      {!firebaseUserLoading && !firebaseUser && <p className="info-text">You are not authenticated!</p>}
      {error && <p className="info-text error">{error}</p>}
    </ModalSignWrapper>
  );
}

export default SignMultichain;
