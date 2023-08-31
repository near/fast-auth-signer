import BN from 'bn.js';
import { utils, transactions as transaction } from 'near-api-js';
import * as React from 'react';
import { useSearchParams } from 'react-router-dom';

import TableContent from '../TableContent/TableContent';
import ArrowDownSvg from '../../Images/arrow-down';
import ArrowUpSvg from '../../Images/arrow-up';
import InternetSvg from '../../Images/Internet';
import RefLogoSvg from '../../Images/ref-logo';
import { useAuthState } from '../../lib/useAuthState';
import { ModalSignWrapper } from './Sign.styles';
import { Button } from '../../lib/Button';

const deserializeTransactionsFromString = (transactionsString: string) =>
  transactionsString
    .split(',')
    .map((str) => Buffer.from(str, 'base64'))
    .map((buffer) =>
      utils.serialize.deserialize(
        transaction.SCHEMA,
        transaction.Transaction,
        buffer
      )
    );

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

export const calculateGasLimit = (actions) =>
  actions
    .filter((a) => Object.keys(a)[0] === 'functionCall')
    .map((a) => a.functionCall.gas)
    .reduce((totalGas, gas) => totalGas.add(gas), new BN(0))
    .toString();

console.log(
  deserializeTransactionsFromString(
    'FAAAAGFtaXJzYXJhbjY2Ni50ZXN0bmV0AAYUlk7TEdgnnkxgrOl0GnJH62x0KVyG+6rEYXeDkNDhQQQPNAb/JwASAAAAZ3Vlc3QtYm9vay50ZXN0bmV0D9601sPAVp/dhtbYoAtzqgqxWEcrrhgwg5Eol1Mo57QBAAAAAgoAAABhZGRNZXNzYWdlJAAAAHsidGV4dCI6InRoaXMgaXMgdGhlIG1lc3NhZ2UgKDEvMikifQDgV+tIGwAAAACAvzUIS2qlHQAAAAAAAA==,FAAAAGFtaXJzYXJhbjY2Ni50ZXN0bmV0AAYUlk7TEdgnnkxgrOl0GnJH62x0KVyG+6rEYXeDkNDhSwQPNAb/JwASAAAAZ3Vlc3QtYm9vay50ZXN0bmV0D9601sPAVp/dhtbYoAtzqgqxWEcrrhgwg5Eol1Mo57QBAAAAAgoAAABhZGRNZXNzYWdlJAAAAHsidGV4dCI6InRoaXMgaXMgdGhlIG1lc3NhZ2UgKDIvMikifQDgV+tIGwAAAACAvzUIS2qlHQAAAAAAAA=='
  )
);

function Sign() {
  const [searchParams] = useSearchParams();
  const [transactionDetails, setTransactionDetails] =
    React.useState<TransactionDetails>({
      signerId: '',
      receiverId: '',
      totalAmount: '0',
      fees: {
        transactionFees: '',
        gasLimit: '',
        gasPrice: '',
      },
      transactions: [],
      actions: [],
    });
  const authenticated = useAuthState();
  const [showDetails, setShowDetails] = React.useState(false);

  React.useEffect(() => {
    const transactionHashes = searchParams.get('transactions');
    const deserializedTransactions =
      deserializeTransactionsFromString(transactionHashes);
    const allActions = deserializedTransactions.flatMap((t) => t.actions);
    setTransactionDetails({
      signerId: deserializedTransactions[0].signerId,
      receiverId: deserializedTransactions[0].receiverId,
      totalAmount: allActions
        .map(
          (a) =>
            (a.transfer && a.transfer.deposit) ||
            (a.functionCall && a.functionCall.deposit) ||
            0
        )
        .filter((a) => a !== 0)
        .reduce(
          (totalAmount: BN, amount) => totalAmount.add(new BN(amount)),
          new BN(0)
        )
        .toString(),
      fees: {
        transactionFees: '',
        gasLimit: calculateGasLimit(allActions),
        gasPrice: '',
      },
      transactions: deserializedTransactions,
      actions: allActions,
    });
  }, []);

  const onConfirm = () => {
    console.log('authenticated', authenticated);
    if (authenticated) {
      (window as any).fastAuthController
        .signAndSendDelegateAction({
          receiverId: transactionDetails.receiverId,
          actions: transactionDetails.actions,
        })
        .then((res: any) => {
          console.log('res', res);
        });
    }
  };

  return (
    <ModalSignWrapper>
      <div className="modal-top">
        <RefLogoSvg />
        <h4>Confirm transaction</h4>

        <div className="transaction-details">
          <InternetSvg />
          app.ref.finance
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
            infoText="First Info Text example"
            rightSide={`${utils.format.formatNearAmount(
              transactionDetails.totalAmount
            )} NEAR`}
            currencyValue="$38.92"
          />
        </div>
      </div>
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
              infoText="Second Info Text example"
              rightSide="< 0.0001 NEAR"
              currencyValue="< $0.01"
            />
          </div>
          <div className="table-wrapper">
            <h4>Actions</h4>
            {transactionDetails.actions.map((action, i) => (
              <TableContent
                key={i}
                leftSide={transactionDetails.receiverId}
                hasFunctionCall
                isFunctionCallOpen
                rightSide={action.functionCall.methodName}
                functionDesc={<pre>{JSON.stringify(action, null, 2)}</pre>}
                openLink={`add links ${i}`}
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
          fill="ghost" />
      </div>
    </ModalSignWrapper>
  );
}

export default Sign;
