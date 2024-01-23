import { encodeSignedDelegate } from '@near-js/transactions';
import BN from 'bn.js';
import { utils, transactions as transaction } from 'near-api-js';
import * as React from 'react';
import { useSearchParams } from 'react-router-dom';

import { ModalSignWrapper } from './Sign.styles';
import {
  fetchGeckoPrices,
} from './Values/fiatValueManager';
import { formatNearAmount } from './Values/formatNearAmount';
import fiatValuesStore from './Values/store';
import ArrowDownSvg from '../../Images/arrow-down';
import ArrowUpSvg from '../../Images/arrow-up';
import InternetSvg from '../../Images/Internet';
import { Button } from '../../lib/Button';
import { useAuthState } from '../../lib/useAuthState';
import { isUrlNotJavascriptProtocol, redirectWithError } from '../../utils';
import { basePath, network } from '../../utils/config';
import TableContent from '../TableContent/TableContent';

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

export const calculateGasLimit = (actions) => actions
  .filter((a) => Object.keys(a)[0] === 'functionCall')
  .map((a) => a.functionCall.gas)
  .reduce((totalGas, gas) => totalGas.add(gas), new BN(0)).div(new BN('1000000000000'))
  .toString();

function Sign() {
  const [searchParams] = useSearchParams();
  const callbackUrl = React.useMemo(() => searchParams.get('success_url') || searchParams.get('failure_url'), [searchParams]);
  const [transactionDetails, setTransactionDetails] =    React.useState<TransactionDetails>({
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
  const { authenticated } = useAuthState();
  const [showDetails, setShowDetails] = React.useState(false);

  const storeFetchedUsdValues = fiatValuesStore(
    (state) => state.storeFetchedUsdValues
  );

  React.useEffect(() => {
    if (!authenticated) {
      const success_url = isUrlNotJavascriptProtocol(searchParams.get('success_url')) && searchParams.get('success_url');
      const failure_url = isUrlNotJavascriptProtocol(searchParams.get('failure_url')) && searchParams.get('failure_url');
      const url = new URL(success_url || failure_url || window.location.origin + (basePath ? `/${basePath}` : ''));
      url.searchParams.append('error', 'User not authenticated');
      window.location.replace(url);
      window.parent.postMessage({ signedDelegates: '', error: 'User not authenticated' }, '*');
    }

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
      const failure_url = isUrlNotJavascriptProtocol(searchParams.get('failure_url')) && searchParams.get('failure_url');
      const parsedUrl = new URL(failure_url || window.location.origin + (basePath ? `/${basePath}` : ''));
      parsedUrl.searchParams.set('code', err.code);
      parsedUrl.searchParams.set('reason', err.message);
      window.location.replace(parsedUrl.href);
      window.parent.postMessage({ signedDelegates: '', error: err.message, code: err.code }, '*');
      return;
    }

    fetchGeckoPrices('near')
      .then((res) => {
        storeFetchedUsdValues(res.near.usd);
      })
      .catch(() => {
        console.warn('Coin Gecko Error');
      });
  // eslint-disable-next-line
  }, []);

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
    if (authenticated === true) {
      const signedTransactions = [];
      const success_url = isUrlNotJavascriptProtocol(searchParams.get('success_url')) && searchParams.get('success_url');
      for (let i = 0; i < transactionDetails.transactions.length; i += 1) {
        try {
          // eslint-disable-next-line
          const signed = await (
            window as any
          ).fastAuthController.signDelegateAction(
            transactionDetails.transactions[i]
          );
          const base64 = Buffer.from(encodeSignedDelegate(signed)).toString(
            'base64'
          );
          signedTransactions.push(base64);
        } catch (err) {
          const failure_url = searchParams.get('failure_url');
          redirectWithError({ success_url, failure_url, error: err });
          window.parent.postMessage({ signedDelegates: '', error: err.message }, '*');
          return;
        }
      }
      const parsedUrl = new URL(success_url || window.location.origin + (basePath ? `/${basePath}` : ''));
      parsedUrl.searchParams.set('transactions', signedTransactions.join(','));
      window.location.replace(parsedUrl.href);
      window.parent.postMessage({ signedDelegates: signedTransactions.join(',') }, '*');
    }
  };

  const onCancel = () => {
    const success_url = isUrlNotJavascriptProtocol(searchParams.get('success_url')) && searchParams.get('success_url');
    const failure_url = isUrlNotJavascriptProtocol(searchParams.get('failure_url')) && searchParams.get('failure_url');
    const url = new URL(success_url || failure_url || window.location.origin + (basePath ? `/${basePath}` : ''));
    url.searchParams.append('error', 'User cancelled action');
    window.location.replace(url);
    window.parent.postMessage({ signedDelegates: '', error:  'User cancelled action' }, '*');
  };

  return (
    <ModalSignWrapper>
      <div className="modal-top">
        <img width="48" height="48" src={`http://www.google.com/s2/favicons?domain=${callbackUrl}&sz=256`} alt={callbackUrl} />
        <h4>Confirm transaction</h4>

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
            leftSide="Total"
            infoText="The estimated total of your transaction including fees."
            rightSide={`${totalNearAmount()} NEAR`}
            currencyValue={`$${totalUsdAmount}`}
          />
        </div>
      </div>
      {/* eslint-disable-next-line */}
      <div
        className="more-details"
        onClick={() => setShowDetails(!showDetails)}
      >
        More details
        <span>{showDetails ? <ArrowUpSvg /> : <ArrowDownSvg />}</span>
      </div>
      {showDetails && (
        <div className="more-details-opened">
          <div className="table-wrapper">
            <h4>Network fees</h4>
            <TableContent
              leftSide="Fee limit"
              rightSide={`${transactionDetails.fees.gasLimit} Tgas`}
            />
            <TableContent
              leftSide="Estimated Fees"
              infoText="The estimated cost of processing your transaction."
              rightSide={`${estimatedNearFees} NEAR`}
              currencyValue={`${estimatedUsdFees()}`}
            />
          </div>
          <div className="table-wrapper">
            <h4>Actions</h4>
            {transactionDetails.actions.map((action, i) => (
              <TableContent
              // eslint-disable-next-line
                key={i}
                leftSide={transactionDetails.transactions[i].receiverId}
                hasFunctionCall
                isFunctionCallOpen
                rightSide={formatActionType(action.enum)}
                functionDesc={action.functionCall.args}
                openLink={`${network.explorerUrl}/accounts/${transactionDetails.transactions[i].receiverId}`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="modal-footer">
        <Button
          variant="primary"
          size="large"
          label="Confirm"
          onClick={onConfirm}
        />
        <Button
          variant="secondary"
          size="large"
          label="Cancel"
          fill="ghost"
          onClick={onCancel}
        />
      </div>
    </ModalSignWrapper>
  );
}

export default Sign;
