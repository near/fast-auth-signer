import { borshDeserialize } from 'borsher';
import React, {
  useEffect, useState, useCallback, useRef
} from 'react';

import { derivationPathSchema } from './schema';
import { Chain, DerivationPathDeserialized, MultichainInterface } from './types';
import {
  validateMessage,
  getTokenAndTotalPrice,
  multichainAssetToNetworkName,
  shortenAddress,
  multichainSignAndSend,
  multichainGetFeeProperties,
  TransactionFeeProperties
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

// TODO: thes are test code for the multichain, use handleMessage with one of sampleMessage variable to test
// Also replace import with import { borshDeserialize, borshSerialize } from 'borsher';
// const ETHDerivationPath = borshSerialize(derivationPathSchema, { asset: 'ETH', domain: '' }).toString('base64');
// const sampleMessageForETH: MultichainInterface = {
//   chainId:          BigInt('11155111'),
//   derivationPath:   ETHDerivationPath,
//   to:               '0x4174678c78fEaFd778c1ff319D5D326701449b25',
//   value:            BigInt('1000000000000000')
// };

// const BNBDerivationPath = borshSerialize(derivationPathSchema, { asset: 'BNB', domain: '' }).toString('base64');
// const sampleMessageForBNB: MultichainInterface = {
//   chainId:          BigInt('97'),
//   derivationPath:   BNBDerivationPath,
//   to:               '0x4174678c78fEaFd778c1ff319D5D326701449b25',
//   value:            BigInt('1000000000000000')
// };

// const BTCDerivationPath = borshSerialize(derivationPathSchema, { asset: 'BTC', domain: '' }).toString('base64');
// const sampleMessageForBTC: MultichainInterface = {
//   derivationPath:   BTCDerivationPath,
//   to:               'tb1qz9f5pqk3t0lhrsuppyzrctdtrtlcewjhy0jngu',
//   value:            BigInt('3000'),
//   from:             'n2ePM9T4N23vgXPwWZo5oRKmUH8mjNhswv'
// };

type TransactionAmountDisplay = {
  price: string | number;
  tokenAmount: string | number;
  feeProperties?: TransactionFeeProperties;
};

function SignMultichain() {
  const { loading: firebaseUserLoading, user: firebaseUser } = useFirebaseUser();
  const signTransactionRef = useRef(null);
  const [amountInfo, setAmountInfo] = useState<TransactionAmountDisplay>({ price: '...', tokenAmount: 0 });
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

  const deserializeDerivationPath = useCallback((path: string): DerivationPathDeserialized | Error => {
    try {
      const deserialize: DerivationPathDeserialized = borshDeserialize(derivationPathSchema, Buffer.from(path, 'base64'));
      setDeserializedDerivationPath(deserialize);
      return deserialize;
    } catch (e) {
      onError(`fail to deserialize derivation path: ${e.message}`);
      return e;
    }
  }, []);

  const signMultichainTransaction = useCallback(async (
    derivationPath: {
    asset?: Chain,
    domain?: string
  },
    transaction: {
      to: string,
      value: bigint,
    },
    feeProperties: TransactionFeeProperties
  ) => {
    try {
      const response = await multichainSignAndSend({
        domain:        derivationPath?.domain,
        asset:         derivationPath?.asset,
        to:            transaction?.to,
        value:         transaction?.value.toString(),
        feeProperties
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
  }, []);

  useEffect(() => {
    // TODO: properly type the incoming data
    const handleMessage = async (event: {data: {data: any, type: string}}) => {
      if (event.data.type === 'multi-chain') {
        try {
          const { data: transaction } = event.data;
          setInFlight(true);
          const deserialize = deserializeDerivationPath(event.data.data.derivationPath);
          if (deserialize instanceof Error) {
            onError(deserialize.message);
            return;
          }

          const validation = await validateMessage(event.data.data, deserialize.asset);
          if (validation instanceof Error || !validation) {
            onError(validation.toString());
            return;
          }

          const { tokenAmount, tokenPrice } = await getTokenAndTotalPrice(deserialize.asset, event.data.data.value);
          const { feeDisplay, ...feeProperties } = await multichainGetFeeProperties({
            asset: deserialize?.asset,
            to:    event.data.data.to,
            value: event.data.data.value,
            ...('from' in event.data.data ? { from: event.data.data.from } : {}),
          });
          const gasFeeInUSD = parseFloat(feeDisplay.toString()) * tokenPrice;
          const transactionCost =  Math.ceil(gasFeeInUSD * 100) / 100;

          setAmountInfo({
            price: transactionCost,
            tokenAmount,
            feeProperties
          });

          if (deserialize?.domain === window.parent.origin && event.data.data) {
            await signMultichainTransaction(deserialize, transaction, amountInfo.feeProperties);
          } else {
            setValid(true);
            setMessage(transaction);
          }
        } catch (e) {
          onError(e.message);
        } finally {
          setInFlight(false);
        }
      }
    };

    window.addEventListener(
      'message',
      handleMessage,
    );

    // TODO: test code, delete later
    // handleMessage({ data: { type: 'multi-chain', data: sampleMessageForBTC } });

    return () => {
      window.removeEventListener('message', handleMessage);
    };
    // add amountInfo.feeProperties to the dependency array when the test code is removed and remove the eslint-disable-next-line
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deserializeDerivationPath, signMultichainTransaction]);

  const onConfirm = async () => {
    setError(null);
    setInFlight(true);
    try {
      const isUserAuthenticated = await getAuthState(firebaseUser?.email);
      if (isUserAuthenticated !== true) {
        onError('You are not authenticated or there has been an indexer failure');
      } else {
        await signMultichainTransaction(deserializedDerivationPath, message, amountInfo.feeProperties);
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
          disabled={inFlight || !isValid || firebaseUserLoading || !firebaseUser || typeof amountInfo.price !== 'number'}
        />
      </div>
      {!firebaseUserLoading && !firebaseUser && <p className="info-text">You are not authenticated!</p>}
      {error && <p className="info-text error">{error}</p>}
    </ModalSignWrapper>
  );
}

export default SignMultichain;
