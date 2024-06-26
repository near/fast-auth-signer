import { encodeSignedDelegate, encodeTransaction } from '@near-js/transactions';
import BN from 'bn.js';
import { utils, transactions as transaction } from 'near-api-js';
import React, {
  useEffect, useRef, useMemo, useState,
} from 'react';
import { useSearchParams } from 'react-router-dom';

import { ModalSignWrapper } from './Sign.styles';
import {
  fetchGeckoPrices,
} from './Values/fiatValueManager';
import { formatNearAmount } from './Values/formatNearAmount';
import fiatValuesStore from './Values/store';
import { getAuthState } from '../../hooks/useAuthState';
import useIframeDialogConfig from '../../hooks/useIframeDialogConfig';
import ArrowDownSvg from '../../Images/arrow-down';
import ArrowUpSvg from '../../Images/arrow-up';
import InternetSvg from '../../Images/Internet';
import { Button } from '../../lib/Button';
import { inIframe, isUrlNotJavascriptProtocol, redirectWithError } from '../../utils';
import { basePath, network } from '../../utils/config';
import TableContent from '../TableContent/TableContent';

type SignTemplateProps = {
  signMethod: 'transaction' | 'delegate'
}

interface PageCopy {
  title: string;
  description: string;
  estimatedFeesHint: string;
  totalFeeHint: string;
}

const pageCopy: Record<SignTemplateProps['signMethod'], PageCopy> = {
  delegate: {
    title:             'Approve Transaction?',
    description:       'You are about to authorize an action. Review the contract details before approving.',
    estimatedFeesHint: 'Fees for this transaction are covered',
    totalFeeHint:      'The total amount you’ll pay',
  },
  transaction: {
    title:             'Sign Transaction?',
    description:       'Please note this transaction requires you to pay for the fees. Review the costs before continuing.',
    estimatedFeesHint: 'You are required to pay the fees for this transaction',
    totalFeeHint:      'The maximum amount you’ll pay',
  },
};

const formatActionType = (action: string) => {
  switch (action) {
    case 'createAccount':
      return 'create_account';
    case 'deployContract':
      return 'deploy_contract';
    case 'functionCall':
      return 'function_call';
    case 'addKey':
      return 'add_key';
    case 'deleteKey':
      return 'delete_key';
    case 'deleteAccount':
      return 'delete_account';
    case 'signedDelegate':
      return 'signed_delegate';
    default:
      return action;
  }
};

const deserializeTransactionsFromString = (transactionsString: string) => transactionsString
  .split(',')
  .map((str) => Buffer.from(str, 'base64'))
  .map((buffer) => utils.serialize.deserialize(
    transaction.SCHEMA,
    transaction.Transaction,
    buffer
  ));

interface TransactionDetails {
  signerId: string;
  receiverId: string;
  totalAmount: string;
  fees: {
    transactionFees: string;
    gasLimit: string;
    gasPrice: string;
  };
  transactions: transaction.Transaction[];
  actions: transaction.Action[];
}

export const calculateGasLimit = (actions: Array<{ functionCall?: { gas: BN } }>): string => actions
  .filter((a) => Object.keys(a)[0] === 'functionCall')
  .map((a) => a.functionCall!.gas)
  .reduce((totalGas, gas) => totalGas.add(gas), new BN(0)).div(new BN('1000000000000'))
  .toString();

function SignTemplate({ signMethod }: SignTemplateProps) {
  const signTransactionRef = useRef(null);
  // Send form height to modal if in iframe
  useIframeDialogConfig({
    element: signTransactionRef.current,
    onClose: () => window.parent.postMessage({ signedTransactions: '', signedDelegates: '', error:  'User cancelled action' }, '*')
  });
  const [inFlight, setInFlight] = useState(false);
  const [error, setError] = useState(null);

  const [searchParams] = useSearchParams();
  const callbackUrl = useMemo(() => {
    const url = new URL(searchParams.get('success_url') || searchParams.get('failure_url'));
    return url.origin;
  }, [searchParams]);

  const [transactionDetails, setTransactionDetails] =    useState<TransactionDetails>({
    signerId:    '',
    receiverId:  '',
    totalAmount: '0',
    fees:        {
      transactionFees: '',
      gasLimit:        '',
      gasPrice:        '',
    },
    transactions: [],
    actions:      [],
  });
  const [showDetails, setShowDetails] = useState(false);

  const storeFetchedUsdValues = fiatValuesStore(
    (state) => state.storeFetchedUsdValues
  );

  useEffect(() => {
    const transactionHashes = searchParams.get('transactions');
    try {
      const deserializedTransactions =      deserializeTransactionsFromString(transactionHashes);
      const allActions = deserializedTransactions.flatMap((t) => t.actions);

      setTransactionDetails({
        signerId:    deserializedTransactions[0].signerId,
        receiverId:  deserializedTransactions[0].receiverId,
        totalAmount: allActions
          .map((a) => a?.transfer?.deposit || a?.functionCall?.deposit || 0)
          .filter((a) => a !== 0)
          .reduce(
            (totalAmount: BN, amount) => totalAmount.add(new BN(amount)),
            new BN(0)
          )
          .toString(),
        fees: {
          transactionFees: '',
          gasLimit:        calculateGasLimit(allActions),
          gasPrice:        '',
        },
        transactions: deserializedTransactions,
        actions:      allActions,
      });
    } catch (err) {
      if (inIframe()) {
        window.parent.postMessage({
          signedTransactions: '', signedDelegates: '', error: err.message, code: err.code
        }, '*');
        setError(err.message);
      } else {
        const failure_url = isUrlNotJavascriptProtocol(searchParams.get('failure_url')) && searchParams.get('failure_url');
        const parsedUrl = new URL(failure_url || window.location.origin + (basePath ? `/${basePath}` : ''));
        parsedUrl.searchParams.set('code', err.code);
        parsedUrl.searchParams.set('reason', err.message);
        window.location.replace(parsedUrl.href);
      }
      return;
    }

    fetchGeckoPrices('near')
      .then((res) => {
        storeFetchedUsdValues(res.near.usd);
      })
      .catch(() => {
        console.warn('Coin Gecko Error');
      });
  }, [searchParams, storeFetchedUsdValues]);

  const fiatValueUsd = fiatValuesStore((state) => state.fiatValueUsd);

  const totalNearAmount = () => formatNearAmount(transactionDetails.totalAmount);

  const totalUsdAmount = (Number(totalNearAmount()) * Number(fiatValueUsd))
    .toFixed(2)
    .toString();

  const estimatedNearFees = formatNearAmount(transactionDetails.fees.gasPrice);

  const estimatedUsdFees = () => {
    let usdFees: string;
    if (estimatedNearFees.includes('<')) usdFees = '< $0.01';
    else if (Number(estimatedNearFees) * Number(fiatValueUsd) < 0.01) { usdFees = '< $0.01'; } else {
      usdFees =        `$${
        (Number(estimatedNearFees) * Number(fiatValueUsd))
          .toFixed(2)
          .toString()}`;
    }

    return usdFees;
  };

  const onConfirm = async () => {
    setError(null);
    setInFlight(true);
    const isUserAuthenticated = await getAuthState();
    if (isUserAuthenticated !== true) {
      const errorMessage = 'You are not authenticated or there has been an indexer failure';
      setError(errorMessage);
      window.parent.postMessage({ signedTransactions: '', signedDelegates: '', error: errorMessage }, '*');
      setInFlight(false);
      return;
    }

    const signedTransactions = [];
    const signedDelegates = [];
    const success_url = isUrlNotJavascriptProtocol(searchParams.get('success_url')) && searchParams.get('success_url');

    // This need to run sequentially due to nonce issues.
    for (let i = 0; i < transactionDetails.transactions.length; i += 1) {
      try {
        const signPromises = transactionDetails.transactions.map(async (t) => {
          if (signMethod === 'transaction') {
            const signedTransaction = await window.fastAuthController.signTransaction(t);
            const encodedTransaction = encodeTransaction(signedTransaction[1]);
            const base64Transaction = Buffer.from(encodedTransaction).toString('base64');
            signedTransactions.push(base64Transaction);
          } else if (signMethod === 'delegate') {
            const signedDelegate = await window.fastAuthController.signDelegateAction(t);
            const encodedDelegate = encodeSignedDelegate(signedDelegate);
            const base64Delegate = Buffer.from(encodedDelegate).toString('base64');
            signedDelegates.push(base64Delegate);
          }
        });

        // eslint-disable-next-line no-await-in-loop
        await Promise.all(signPromises);
      } catch (err) {
        if (inIframe()) {
          setError(`An error occurred: ${err.message}`);
          setInFlight(false);
          window.parent.postMessage({ signedTransactions: '', signedDelegates: '', error: err.message }, '*');
        } else {
          const failure_url = searchParams.get('failure_url');
          redirectWithError({ success_url, failure_url, error: err });
        }
        return;
      }
    }

    if (inIframe()) {
      if (signMethod === 'transaction') {
        window.parent.postMessage({ signedTransactions: signedTransactions.join(','), signedDelegates: '', closeIframe: true }, '*');
      } else if (signMethod === 'delegate') {
        window.parent.postMessage({ signedTransactions: '', signedDelegates: signedDelegates.join(','), closeIframe: true }, '*');
      }
    } else {
      const parsedUrl = new URL(success_url || window.location.origin + (basePath ? `/${basePath}` : ''));
      if (signMethod === 'transaction') {
        parsedUrl.searchParams.set('signedTransactions', signedTransactions.join(','));
      } else if (signMethod === 'delegate') {
        parsedUrl.searchParams.set('signedDelegates', signedDelegates.join(','));
      }
      window.location.replace(parsedUrl.href);
    }

    setInFlight(false);
  };

  return (
    <ModalSignWrapper ref={signTransactionRef}>
      {(
        <div className="modal-body">
          <div className="modal-top">
            <img width="48" height="48" src={`http://www.google.com/s2/favicons?domain=${callbackUrl}&sz=256`} alt={callbackUrl} />
            <h4>{pageCopy[signMethod].title}</h4>
            <div className="transaction-alert">
              {pageCopy[signMethod].description}
            </div>
            <div className="transaction-details">
              <InternetSvg />
              {callbackUrl || 'Unknown App'}
            </div>
          </div>

          <div className="modal-middle">
            <div className="table-wrapper">
              <TableContent
                leftSide="From"
                rightSide={transactionDetails.signerId}
              />
              <TableContent
                leftSide="To"
                rightSide={transactionDetails.receiverId}
              />
            </div>
            <div className="table-wrapper">
              <TableContent
                leftSide="Estimated fee"
                infoText={pageCopy[signMethod].estimatedFeesHint}
                rightSide={`${estimatedUsdFees()}`}
                currencyValue={`Paid by ${signMethod === 'transaction' ? 'you' : new URL(document.referrer).hostname}`}
                isDelegated={signMethod === 'delegate'}
              />
              <TableContent
                leftSide="Total"
                infoText={pageCopy[signMethod].totalFeeHint}
                rightSide={`$${totalUsdAmount}`}
                dataTestIds={{
                  rightSideContent: 'total-right-side-content',
                }}
              />
            </div>
          </div>
          {/* eslint-disable-next-line */}
          <div
            className="more-details"
            data-testid="more-details-button"
            onClick={() => setShowDetails(!showDetails)}
          >
            More details
            <span>{showDetails ? <ArrowUpSvg /> : <ArrowDownSvg />}</span>
          </div>
          {showDetails && (
            <div className="more-details-opened">
              <div className="table-wrapper">
                <h4>Actions</h4>
                {transactionDetails.transactions.map((t) => t.actions.map((action) => (
                  <TableContent
                    leftSide={t.receiverId}
                    hasFunctionCall={!!action?.functionCall}
                    isFunctionCallOpen
                    rightSide={formatActionType(action.enum)}
                    functionDesc={action?.functionCall?.args}
                    openLink={`${network.explorerUrl}/accounts/${t.receiverId}`}
                  />
                )))}
              </div>
            </div>
          )}
          <Button
            variant="affirmative"
            size="large"
            label={inFlight ? 'Loading...' : 'Confirm'}
            disabled={inFlight}
            data-test-id="confirm-transaction-button"
            onClick={onConfirm}
          />
          {error && <p className="info-text error">{error}</p>}
        </div>
      )}
    </ModalSignWrapper>
  );
}

export default SignTemplate;
