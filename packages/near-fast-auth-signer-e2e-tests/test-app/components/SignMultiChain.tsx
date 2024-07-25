import { yupResolver } from '@hookform/resolvers/yup';
import { FastAuthWallet } from 'near-fastauth-wallet';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';

import {
  getDomain, toSatoshis, toWei
} from '../../utils/multiChain';
import useWalletSelector from '../hooks/useWalletSelector';

export type TransactionFormValues = {
  keyType: string,
  assetType: 'BTC' | 'ETH' | 'BNB',
  amount: number,
  address: string,
  isFunctionCall: boolean,
  useLocalRpc: boolean,
}

type FastAuthWalletInterface = Awaited<ReturnType<typeof FastAuthWallet>>;

const schema = yup.object().shape({
  keyType:        yup.string().required('Please select a key type'),
  assetType:      yup.string().oneOf(['BTC', 'ETH', 'BNB']).required('Please select an asset type'),
  amount:         yup.number().required('Please enter amount'),
  address:        yup.string().required('Please enter wallet address'),
  isFunctionCall: yup.boolean().required(),
  useLocalRpc:    yup.boolean().required(),
}).required();

const keyTypes = [
  { id: 'domainKey', value: 'domainKey', label: 'Domain Key' },
  { id: 'personalKey', value: 'personalKey', label: 'Personal Key' },
  { id: 'unknownKey', value: 'unknownKey', label: 'Unknown Key' },
];

const assetTypes = [
  {
    id: 'eth', value: 'ETH', chainId: 11155111, label: 'ETH (Sepolia Testnet)'
  },
  {
    id: 'bnb', value: 'BNB', chainId: 97, label: 'BNB (BSC Testnet)'
  },
  {
    id: 'btc', value: 'BTC', chainId: 0, label: 'BTC (Testnet)'
  },
];

export default function SignMultiChain() {
  const selectorInstance = useWalletSelector();
  const {
    handleSubmit, register,
  } = useForm({
    mode:          'all',
    resolver:      yupResolver(schema),
    defaultValues: {
      isFunctionCall: false,
      useLocalRpc:    false,
    }
  });

  const [fastAuthWallet, setFastAuthWallet] = useState<FastAuthWalletInterface | null>(null);

  useEffect(() => {
    const getWallet = async () => {
      if (!selectorInstance) return;

      const wallet = await selectorInstance.wallet('fast-auth-wallet');
      // Using any because the selector exposes the NEP wallet interface that cannot be cast to the current FastAuthWallet interface
      setFastAuthWallet(wallet as any);
    };

    getWallet();
  }, [selectorInstance]);

  const onSubmitForm = async (values: TransactionFormValues) => {
    const domain = getDomain(values.keyType);
    const selectedAsset = assetTypes.find((asset) => asset.value === values.assetType);

    if (!fastAuthWallet || !selectedAsset) return;

    if (values.assetType === 'BTC') {
      await fastAuthWallet.signMultiChainTransaction({
        derivationPath: {
          chain: 0,
          ...(domain ? { domain } : {}),
        },
        transaction: {
          to:      values.address,
          value:   toSatoshis(Number(values.amount)),
        },
        chainConfig: {
          network: 'testnet',
        },
      });
    } else {
      await fastAuthWallet.signMultiChainTransaction({
        derivationPath: {
          chain: 60,
          ...(domain ? { domain } : {}),
        },
        ...(values.useLocalRpc ? {
          chainConfig: {
            providerUrl: 'http://localhost:8545',
          }
        } : {}),
        transaction: {
          to:      values.address,
          value:   toWei(Number(values.amount)),
          chainId: selectedAsset.chainId,
          data:    values.isFunctionCall ? window.localStorage.getItem('evmFunctionCallData') : undefined,
        },
      });
    }
  };

  return (
    <div
      style={{
        border: '1px solid #ddd', width: 'fit-content', margin: '15px 0'
      }}
    >
      <h5>Sign MultiChain Transactions</h5>
      <form
        style={{
          display: 'flex', flexDirection: 'column', gap: 5, margin: '5px'
        }}
        onSubmit={handleSubmit(onSubmitForm, (e) => console.error(e))}
      >
        <div
          className="input-group"
          style={{ display: 'flex', gap: 3, marginBottom: '5px' }}
        >
          {keyTypes.map((keyType) => (
            <label htmlFor={keyType.id} className="radio-label" key={keyType.id}>
              <input
                type="radio"
                id={keyType.id}
                value={keyType.value}
                {...register('keyType')}
              />
              {keyType.label}
            </label>
          ))}
        </div>
        <div
          className="input-group"
          style={{ display: 'flex', gap: 3, marginBottom: '5px' }}
        >
          {assetTypes.map((assetType) => (
            <label htmlFor={assetType.id} className="radio-label" key={assetType.id}>
              <input
                type="radio"
                id={assetType.id}
                value={assetType.value}
                {...register('assetType')}
              />
              {assetType.label}
            </label>
          ))}
        </div>
        <div
          className="input-group"
          style={{ marginBottom: '10px' }}
        >
          <label htmlFor="amount" className="radio-label">
            Amount
            <input
              type="text"
              id="amount"
              {...register('amount')}
              style={{ marginLeft: '3px' }}
            />
          </label>
        </div>
        <div
          className="input-group"
          style={{ marginBottom: '10px' }}
        >
          <label htmlFor="address" className="radio-label">
            Address
            <input
              type="text"
              id="address"
              {...register('address')}
              style={{ marginLeft: '3px' }}
            />
          </label>
        </div>
        <div
          className="input-group"
          style={{ marginBottom: '10px' }}
        >
          <label htmlFor="isFunctionCall" className="checkbox-label">
            <input
              type="checkbox"
              id="isFunctionCall"
              {...register('isFunctionCall')}
            />
            Is Function Call
          </label>
        </div>
        <div
          className="input-group"
          style={{ marginBottom: '10px' }}
        >
          <label htmlFor="useLocalRpc" className="checkbox-label">
            <input
              type="checkbox"
              id="useLocalRpc"
              {...register('useLocalRpc')}
            />
            Use Local RPC
          </label>
        </div>
        <button type="submit" style={{ width: 'fit-content', marginBottom: '15px' }}>
          Submit
        </button>
      </form>
    </div>
  );
}
