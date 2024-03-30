import React, {
  useEffect, useState, useCallback, useRef, useMemo
} from 'react';
import styled from 'styled-components';

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
import WarningCircleSVG from '../../Images/WarningCircle';
import WarningTriangleSVG from '../../Images/WarningTriangle';
import { Button } from '../../lib/Button';
import { isSafari } from '../../utils';
import { StyledCheckbox } from '../Devices/Devices';
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

const Container = styled.div`
  display: flex;
  font-size: 12px;
  margin-top: 16px;

  > button {
    width: 100%;
  }
`;

const WarningContainer = styled.div`
  display: flex;
  border-radius: 6px;
  border: 1px solid var(--Red-Light-7, #FE8371);
  background: var(--Red-Light-4, #FFC9C2);
  box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.06);
  align-items: center;
  color: var(--Red-Light-12, var(--Red-Light-12, #4B0B02));
  padding: 8px 12px;
  font-size: 11px;
  > svg {
    margin-right: 12px;
  }
`;

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
  const [isUnsafe, setUnsafe] = useState(false);
  const [check, setCheck] = useState(false);
  const isSafariBrowser = isSafari();

  // Send form height to modal if in iframe
  useIframeDialogConfig({
    element: signTransactionRef.current,
    onClose: () => window.parent.postMessage({ type: 'method', message: 'User cancelled action' }, '*')
  });

  const onError = (text: string) => {
    window.parent.postMessage({ type: 'multiChainResponse', message: text, closeIframe: true }, '*');
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
          window.parent.postMessage({ type: 'multiChainResponse', message: `Successfully sign and send transaction, ${response.transactionHash}`, closeIframe: true }, '*');
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

          // if the domain is the same as the origin, hide the modal
          if (transaction?.domain === event?.origin && !isSafariBrowser) {
            // Check early to hide the UI quicker
            window.parent.postMessage({ hideModal: true }, '*');
          }

          if (transaction?.domain && transaction?.domain !== event?.origin) {
            setUnsafe(true);
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
          if (transaction?.domain === event?.origin && !isSafariBrowser) {
            await signMultichainTransaction(transaction, feeProperties);
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

  if (isDomainKey && isSafariBrowser) {
    return (
      <ModalSignWrapper ref={signTransactionRef}>
        <div className="modal-top">
          <h3>Passkey Required</h3>
          <h5>{inFlight ? 'Follow the prompts to continue.' : 'Use your passkey to confirm the transaction'}</h5>
        </div>
        <Container>
          <Button
            variant="primary"
            size="large"
            label={inFlight ? 'Loading...' : 'Continue'}
            onClick={onConfirm}
            disabled={
              inFlight || !isValid || typeof amountInfo.price !== 'number'
            }
          />
        </Container>
        {error && <p className="info-text error">{error}</p>}
      </ModalSignWrapper>
    );
  }

  return (
    <ModalSignWrapper ref={signTransactionRef} hide={message?.domain === origin} warning={isUnsafe}>
      <div className="modal-top">
        <ModalIconSvg />
        <h3>Approve Transaction?</h3>
        <div className="transaction-details">
          { isUnsafe ? <WarningCircleSVG /> : <InternetSvg />}
          { message?.domain || origin || 'Unknown App'}
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
      {
        isUnsafe && (
          <>
            <Container>
              <StyledCheckbox type="checkbox" onChange={() => setCheck(!check)} checked={check} />
              <p>
                I’ve carefully reviewed the request and trust
                {' '}
                <b>{message?.domain}</b>
              </p>
            </Container>
            <WarningContainer>
              <WarningTriangleSVG />
              <span>
                We don’t recognize this app, proceed with caution
              </span>
            </WarningContainer>
          </>
        )
      }
      <Container>
        <Button
          variant="affirmative"
          size="large"
          label={inFlight ? 'Loading...' : 'Approve'}
          onClick={onConfirm}
          disabled={inFlight || !isValid || typeof amountInfo.price !== 'number' || (isUnsafe && !check)}
        />
      </Container>
      {error && <p className="info-text error">{error}</p>}
    </ModalSignWrapper>
  );
}

export default SignMultichain;
