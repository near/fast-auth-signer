import { ethers } from 'ethers';
import { EVMRequest } from 'multichain-tools';
import React, {
  useState, useCallback, useRef, useMemo
} from 'react';
import styled from 'styled-components';

import {
  Chain,
  SendMultichainMessage,
} from './types';
import { getEVMFunctionCallMessage } from './utils/evm';
import {
  validateMessage,
  getTokenAndTotalPrice,
  shortenAddress,
  multichainSignAndSend,
  multichainGetFeeProperties,
  TransactionFeeProperties,
  getMultichainAssetInfo,
} from './utils/utils';
import { getAuthState } from '../../hooks/useAuthState';
import useIframeDialogConfig from '../../hooks/useIframeDialogConfig';
import { IframeRequestEvent, useIframeRequest } from '../../hooks/useIframeRequest';
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

type TransactionAmountDisplay = {
  price: string | number;
  tokenAmount: string | number;
  feeProperties?: TransactionFeeProperties;
};

const Container = styled.div`
  display: flex;
  font-size: 12px;
  margin-top: 32px;

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
  const [message, setMessage] = useState<SendMultichainMessage | null>(null);
  const [inFlight, setInFlight] = useState(false);
  const [error, setError] = useState(null);
  const [isValid, setValid] = useState(null);
  const [origin, setOrigin] = useState(null);
  const [isDomainKey, setIsDomainKey] = useState(true);
  const tokenSymbol = useMemo(
    () => message && getMultichainAssetInfo(message)?.tokenSymbol,
    [message]
  );
  const [isUnsafe, setUnsafe] = useState(false);
  const [check, setCheck] = useState(false);
  const isSafariBrowser = isSafari();
  const [isEVMFunctionCall, setIsEVMFunctionCall] = useState(false);
  const [evmFunctionCallMessage, setEVMFunctionCallMessage] = useState(null);

  // Send form height to modal if in iframe
  useIframeDialogConfig({
    element: signTransactionRef.current,
    onClose: () => window.parent.postMessage({ type: 'method', message: 'User cancelled action' }, '*')
  });

  const onError = (text: string) => {
    setError(text);
  };

  const signMultichainTransaction = useCallback(async (
    signMultichainRequest: SendMultichainMessage,
    feeProperties: TransactionFeeProperties
  ) => {
    try {
      const response = await multichainSignAndSend({
        signMultichainRequest,
        feeProperties,
      });
      if (response.success && 'transactionHash' in response) {
        window.parent.postMessage({
          type: 'multiChainResponse', transactionHash: response.transactionHash, message: 'Successfully signed and sent transaction', closeIframe: true
        }, '*');
      } else if (response.success === false) {
        onError(response.errorMessage);
      }
    } catch (e) {
      onError(e.message);
      throw new Error('Failed to sign delegate');
    }
  }, []);

  const iframeEventHandler = useCallback(async (event: IframeRequestEvent<SendMultichainMessage>) => {
    setOrigin(event?.origin);
    try {
      const { data: transaction } = event.data;
      setInFlight(true);

      const validation = await validateMessage(transaction);
      if (validation instanceof Error || !validation) {
        onError(validation.toString());
        return;
      }

      const isUserAuthenticated = await getAuthState();
      if (isUserAuthenticated !== true) {
        onError('You are not authenticated or there has been an indexer failure');
        return;
      }

      // if the domain is the same as the origin, hide the modal
      if (transaction?.derivationPath.domain === event?.origin && !isSafariBrowser) {
        // Check early to hide the UI quicker
        window.parent.postMessage({ hideModal: true }, '*');
      }

      if (transaction.derivationPath.chain === 60) {
        const evmRequest = transaction as EVMRequest;
        if (evmRequest.transaction.data) {
          setIsEVMFunctionCall(true);
          const { data, value, to } = evmRequest.transaction;
          const ethersProvider = new ethers
            .JsonRpcProvider(getMultichainAssetInfo(transaction)?.chainConfig.providerUrl);

          setEVMFunctionCallMessage(await getEVMFunctionCallMessage(
            { data, value, to },
            ethersProvider
          ));
        }
      }

      if (transaction?.derivationPath.domain && transaction?.derivationPath.domain !== event?.origin) {
        setUnsafe(true);
      }

      const { tokenAmount, tokenPrice } = await getTokenAndTotalPrice(transaction);
      const { feeDisplay, ...feeProperties } = await multichainGetFeeProperties(
        transaction,
        window.fastAuthController.getAccountId()
      );

      const gasFeeInUSD = parseFloat(feeDisplay.toString()) * tokenPrice;
      const transactionCost =  Math.ceil(gasFeeInUSD * 100) / 100;

      setAmountInfo({
        price: transactionCost,
        tokenAmount,
        feeProperties
      });
      setValid(true);
      setIsDomainKey(transaction?.derivationPath.domain === event?.origin);
      setMessage(transaction);

      if (transaction?.derivationPath.domain === event?.origin && !isSafariBrowser) {
        await signMultichainTransaction(transaction, feeProperties);
      }
    } catch (e) {
      onError(e.message);
    } finally {
      setInFlight(false);
    }
  }, [isSafariBrowser, signMultichainTransaction]);

  useIframeRequest<SendMultichainMessage>({
    eventType: {
      loaded:   'signMultiChainLoaded',
      request:  'multiChainRequest',
    },
    eventHandler: iframeEventHandler
  });

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
        <div className="modal-body">
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
        </div>
      </ModalSignWrapper>
    );
  }

  return (
    <ModalSignWrapper ref={signTransactionRef} hide={message?.derivationPath?.domain === origin} warning={isUnsafe}>
      <div className="modal-body">
        <div className="modal-top">
          <ModalIconSvg />
          <h3>Approve Transaction?</h3>
          <div className="transaction-details">
            { isUnsafe ? <WarningCircleSVG /> : <InternetSvg />}
            { message?.derivationPath?.domain || origin || 'Unknown App'}
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
                  content={<b><span title={message?.transaction?.to || ''}>{`${shortenAddress(message?.transaction.to || '...')}`}</span></b>}
                />
              )}
            />
            <TableContent
              leftSide="Network"
              rightSide={(
                <TableRow
                  asset={tokenSymbol as Chain}
                  content={message && getMultichainAssetInfo(message)?.networkName}
                />
              )}
            />
            {isEVMFunctionCall && evmFunctionCallMessage && (
              <TableContent
                leftSide={evmFunctionCallMessage}
              />
            )}
          </div>
          <div className="table-wrapper">
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
                  <b>{message?.derivationPath?.domain}</b>
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
      </div>
    </ModalSignWrapper>
  );
}

export default SignMultichain;
