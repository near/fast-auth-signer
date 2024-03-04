import { borshDeserialize } from 'borsher';
import * as React from 'react';

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
import InternetSvg from '../../Images/Internet';
import ModalIconSvg from '../../Images/ModalIcon';
import { Button, CloseButton } from '../../lib/Button';
import { useAuthState } from '../../lib/useAuthState';
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
  const { authenticated } = useAuthState();
  const [amountInfo, setAmountInfo] = React.useState<{ price: string | number, tokenAmount: string | number }>({ price: '...', tokenAmount: 0 });

  const onError = (error: string) => {
    window.parent.postMessage({ signedDelegates: '', error }, '*');
  };

  const [message, setMessage] = React.useState<MultichainIframeMessage>(null);
  const [signedDelegates, setSignedDelegates] = React.useState<string>('');
  const [deserializedDerivationPath, setDeserializedDerivationPath] = React.useState<DerivationPathDeserialized>(null);

  React.useEffect(() => {
    if (!authenticated) {
      window.parent.postMessage({ signedDelegates: '', error: 'User not authenticated' }, '*');
    }
    const handleMessage = (event) => {
      console.log('event', event);
      // Maybe add origin check here? if url of origin is available, maybe update below
      console.log('Message received in iframe: ', event.data);
      if (event.data.data) {
        setMessage(event.data.data);
      }
    };

    if (authenticated === true) {
      window.addEventListener(
        'message',
        handleMessage,
      );

      // TODO: test code, delete later
      console.log('set temp message');
      setMessage(sampleMessageForEthereum);
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [authenticated]);

  React.useEffect(() => {
    if (message === null) return;

    if (message !== null && !('derivationPath' in message)) {
      onError('derivationPath is missing');
    }

    const init = async () => {
      if (message !== null && 'derivationPath' in message) {
        const deserialize: DerivationPathDeserialized = borshDeserialize(derivationPathSchema, Buffer.from(message.derivationPath, 'base64'));
        setDeserializedDerivationPath(deserialize);

        const validation = await validateMessage(message, deserialize.asset);
        if (!validation) {
          return onError(validation.toString());
        }

        const controller = window.fastAuthController;
        const publicKey = await controller.getPublicKey();
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

        try {
          const signedDelegateBase64 = await getSignedDelegateBase64({
            najPublicKeyStr:            publicKey,
            message,
            deserializedDerivationPath: deserialize,
          });
          setSignedDelegates(signedDelegateBase64);

          // If domain info passed from derivation path is same as window.parent.orgin, post message to parent directly
          if (deserialize.domain === window.parent.origin) {
            return window.parent.postMessage({ signedDelegates: signedDelegateBase64 }, '*');
          }
        } catch (e) {
          throw new Error('Failed to sign delegate');
        }
      }
      return null;
    };
    try {
      if (authenticated) {
        init();
      }
    } catch (e) {
      console.error('Error in init', e);
    }
  }, [message, authenticated]);

  const onConfirm = async () => {
    if (authenticated === true) {
      console.log('signedDelegates', signedDelegates);
      window.parent.postMessage({ signedDelegates }, '*');
    }
  };

  const onCancel = () => {
    window.parent.postMessage({ signedDelegates: '', error:  'User cancelled action' }, '*');
  };

  return (
    <ModalSignWrapper>
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
          label="Approve"
          onClick={onConfirm}
          disabled={!signedDelegates}
        />
      </div>
    </ModalSignWrapper>
  );
}

export default SignMultichain;
