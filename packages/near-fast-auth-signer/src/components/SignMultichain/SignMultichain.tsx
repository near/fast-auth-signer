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

  const signMultichainTransaction = useCallback(async () => {
    if (isValid && message) {
      try {
        const response = await multichainSignAndSend({
          domain: deserializedDerivationPath?.domain,
          asset:  deserializedDerivationPath?.asset,
          to:     message?.to,
          value:  message?.value,
        });
        if (response.success) {
          window.parent.postMessage({ type: 'response', message: `Successfully sign and send transaction, ${response.transactionHash}` }, '*');
        } else if (response.success === false) {
          onError(response.errorMessage);
        }
      } catch (e) {
        onError(e.message);
        throw new Error('Failed to sign delegate');
      }
    }
  }, [deserializedDerivationPath?.asset, deserializedDerivationPath?.domain, isValid, message]);

  useEffect(() => {
    const handleMessage = async (event: {data: {data: any}}) => {
      setInFlight(true);
      try {
        if (event.data.data) {
          const deserialize = deserializeDerivationPath(event.data.data.derivationPath);
          const validation = await validateMessage(event.data.data, deserialize.asset);
          if (validation instanceof Error || !validation) {
            onError(validation.toString());
            return;
          }

          const { tokenAmount, tokenPrice } = await getTokenAndTotalPrice(deserialize.asset, event.data.data.value);
          const totalGas = await multichainGetTotalGas({
            asset: deserialize?.asset,
            to:    event.data.data.to,
            value: event.data.data.value,
            ...('from' in event.data.data ? { from: event.data.data.from } : {}),
          });
          const gasFeeInUSD = parseFloat(totalGas.toString()) * tokenPrice;
          const transactionCost =  Math.ceil(gasFeeInUSD * 100) / 100;

          setAmountInfo({
            price: transactionCost,
            tokenAmount,
          });

          if (deserializedDerivationPath?.domain === window.parent.origin && event.data.data) {
            await signMultichainTransaction();
          } else {
            setValid(true);
            setMessage(event.data.data);
          }
        }
      } catch (e) {
        onError(e.message);
      } finally {
        setInFlight(false);
      }
    };

    window.addEventListener(
      'message',
      handleMessage,
    );

    // TODO: test code, delete later
    console.log('set temp message');
    handleMessage({ data: { data: sampleMessageForBitcoin } });

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [deserializeDerivationPath, deserializedDerivationPath?.domain, signMultichainTransaction]);

  const onConfirm = async () => {
    setError(null);
    setInFlight(true);
    try {
      const isUserAuthenticated = await getAuthState(firebaseUser?.email);
      if (isUserAuthenticated !== true) {
        onError('You are not authenticated or there has been an indexer failure');
      } else {
        await signMultichainTransaction();
      }
    } catch (e) {
      onError(e.message);
    } finally {
      setInFlight(false);
    }
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
