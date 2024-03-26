import React, {
  useEffect, useState, useCallback, useRef, useMemo
} from 'react';

import {
  Chain, EvmSendMultichainMessage, SendMultichainMessage
} from './types';
import {
  validateMessage,
  getTokenAndTotalPrice,
  multichainAssetToNetworkName,
  shortenAddress,
  multichainSignAndSend,
  multichainGetFeeProperties,
  TransactionFeeProperties,
  getTokenSymbol
} from './utils';
import { getAuthState } from '../../hooks/useAuthState';
import useIframeDialogConfig from '../../hooks/useIframeDialogConfig';
import InternetSvg from '../../Images/Internet';
import ModalIconSvg from '../../Images/ModalIcon';
import { Button } from '../../lib/Button';
import { ModalSignWrapper } from '../Sign/Sign.styles';
import TableContent from '../TableContent/TableContent';
import { TableRow } from '../TableRow/TableRow';

type IncomingMessageEvent = MessageEvent<{
  data: SendMultichainMessage;
  type: string;
}>;

// const sampleMessageForEthereum: EvmSendMultichainMessage = {
//   chainId: BigInt('5'),
//   chain: 60,
//   domain: "near.org",
//   to: "0x47bF16C0e80aacFf796E621AdFacbFaaf73a94A4",
//   value: BigInt('10000000000000000'),
//   meta: {id: 10}
// }

// const sampleMessageForBTC: BTCSendMultichainMessage = {
//   network: 'mainnet',
//   chain: 0,
//   domain: "near.org",
//   to: "1K7xkspJg6J8kEZjX9jowFtyXo6JLXUhYj",
//   value: BigInt('10000000000000000'),
//   meta: {id: 10}
// }

type TransactionAmountDisplay = {
  price: string | number;
  tokenAmount: string | number;
  feeProperties?: TransactionFeeProperties;
};

function SignMultichain() {
  const signTransactionRef = useRef(null);
  const [amountInfo, setAmountInfo] = useState<TransactionAmountDisplay>({ price: '...', tokenAmount: 0 });
  const [message, setMessage] = useState<SendMultichainMessage>(null);
  const [inFlight, setInFlight] = useState(false);
  const [error, setError] = useState(null);
  const [isValid, setValid] = useState(null);
  const [origin, setOrigin] = useState(null);
  const [isDomainKey, setIsDomainKey] = useState(true);
  const tokenSymbol = useMemo(
    () => getTokenSymbol({
      chain:   message?.chain,
      chainId: (message as EvmSendMultichainMessage)?.chainId,
    }),
    [message]
  );

  // Send form height to modal if in iframe
  useIframeDialogConfig({
    element: signTransactionRef.current,
    onClose: () => window.parent.postMessage({ type: 'method', message: 'User cancelled action' }, '*')
  });

  const onError = (text: string) => {
    window.parent.postMessage({ type: 'multiChainResponse', message: text }, '*');
    setError(text);
  };

  const signMultichainTransaction = useCallback(async (
    signMultichainRequest: SendMultichainMessage,
    feeProperties: TransactionFeeProperties
  ) => {
    try {
      const isUserAuthenticated = await getAuthState();
      if (isUserAuthenticated !== true) {
        onError('You are not authenticated or there has been an indexer failure');
      } else {
        const response = await multichainSignAndSend({
          signMultichainRequest,
          feeProperties,
        });
        if (response.success && 'transactionHash' in response) {
          window.parent.postMessage({ type: 'multiChainResponse', message: `Successfully sign and send transaction, ${response.transactionHash}` }, '*');
        } else if (response.success === false) {
          onError(response.errorMessage);
        }
      }
    } catch (e) {
      onError(e.message);
      throw new Error('Failed to sign delegate');
    }
  }, []);

  useEffect(() => {
    // TODO: properly type the incoming data
    const handleMessage = async (event: IncomingMessageEvent) => {
      if (event.data.type === 'multiChainRequest' && event?.data?.data) {
        setOrigin(event?.origin);
        try {
          const { data: transaction } = event.data;
          setInFlight(true);

          const validation = await validateMessage(transaction);
          if (validation instanceof Error || !validation) {
            onError(validation.toString());
            return;
          }

          const { tokenAmount, tokenPrice } = await getTokenAndTotalPrice(transaction);
          const { feeDisplay, ...feeProperties } = await multichainGetFeeProperties({
            chain: transaction.chain,
            to:    transaction.to,
            value: transaction.value.toString(),
            from:  transaction.from,
          });
          const gasFeeInUSD = parseFloat(feeDisplay.toString()) * tokenPrice;
          const transactionCost =  Math.ceil(gasFeeInUSD * 100) / 100;

          setAmountInfo({
            price: transactionCost,
            tokenAmount,
            feeProperties
          });
          setValid(true);
          setIsDomainKey(transaction?.domain === event?.origin);
          setMessage(transaction);
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

    window.parent.postMessage({ type: 'signMultiChainLoaded' }, '*');

    return () => {
      window.removeEventListener('message', handleMessage);
    };
    // add amountInfo.feeProperties to the dependency array when the test code is removed and remove the eslint-disable-next-line
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signMultichainTransaction]);

  const onConfirm = async () => {
    setError(null);
    setInFlight(true);
    try {
      await signMultichainTransaction(message, amountInfo.feeProperties);
    } catch (e) {
      onError(e.message);
    } finally {
      setInFlight(false);
    }
  };

  if (isDomainKey) {
    return (
      <ModalSignWrapper ref={signTransactionRef}>
        <div className="modal-footer">
          <Button
            variant="affirmative"
            size="large"
            label={inFlight ? 'Loading...' : 'Approve'}
            onClick={onConfirm}
            disabled={
              inFlight || !isValid || typeof amountInfo.price !== 'number'
            }
          />
        </div>
        {error && <p className="info-text error">{error}</p>}
      </ModalSignWrapper>
    );
  }

  return (
    <ModalSignWrapper ref={signTransactionRef}>
      <div className="modal-top">
        <ModalIconSvg />
        <h3>Approve Transaction?</h3>
        <h5>{`${message?.domain || 'Unknown App'} has requested a transaction, review the request before confirming.`}</h5>
        <div className="transaction-details">
          <InternetSvg />
          {origin || 'Unknown App'}
        </div>
      </div>
      <div className="modal-middle">
        <div className="table-wrapper">
          <TableContent
            leftSide="Details"
            rightSide={(
              <TableRow
                content={`${amountInfo.tokenAmount ? `Send ${amountInfo.tokenAmount} ${tokenSymbol}` : '...'}`}
              />
            )}
          />
          <TableContent
            leftSide="to"
            rightSide={(
              <TableRow
                asset={tokenSymbol as Chain}
                content={<b><span title={message?.to || ''}>{`${shortenAddress(message?.to || '...')}`}</span></b>}
              />
            )}
          />
          <TableContent
            leftSide="Network"
            rightSide={(
              <TableRow
                asset={tokenSymbol as Chain}
                content={multichainAssetToNetworkName({
                  chain:   message?.chain,
                  chainId: (message as EvmSendMultichainMessage)?.chainId,
                })}
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
      {error && <p className="info-text error">{error}</p>}
    </ModalSignWrapper>
  );
}

export default SignMultichain;
