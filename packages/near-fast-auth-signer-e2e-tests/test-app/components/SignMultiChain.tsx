import { yupResolver } from '@hookform/resolvers/yup';
import React from 'react';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';

export type TransactionFormValues = {
  keyType: string,
  assetType: 0 | 60,
  amount: string,
  address: string,
  chainId: number,
}

type SignMultiChainProps = {
  onSubmitForm: (_values: TransactionFormValues) => void
}

const schema = yup.object().shape({
  keyType:   yup.string().required('Please select a key type'),
  assetType: yup.number().oneOf([0, 60]).required('Please select an asset type'),
  amount:    yup.string().required('Please enter amount'),
  address:   yup.string().required('Please enter wallet address'),
  chainId:   yup.number().required(),
}).required();

const keyTypes = [
  { id: 'domainKey', value: 'domainKey', label: 'Domain Key' },
  { id: 'personalKey', value: 'personalKey', label: 'Personal Key' },
  { id: 'unknownKey', value: 'unknownKey', label: 'Unknown Key' },
];

const assetTypes = [
  {
    id: 'eth', value: 60, dataChainId: 11155111, label: 'ETH sepolia'
  },
  {
    id: 'bnb', value: 60, dataChainId: 97, label: 'BSC testnet'
  },
  {
    id: 'btc', value: 0, dataChainId: 0, label: 'BTC testnet'
  },
];

export default function SignMultiChain(props: SignMultiChainProps) {
  const { onSubmitForm } = props;

  const {
    handleSubmit, setValue, register,
  } = useForm({
    mode:          'all',
    resolver:      yupResolver(schema),
    defaultValues: {}
  });

  const handleAssetTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setValue('chainId', parseInt(event.target.getAttribute('data-chainid'), 10));
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
        onSubmit={handleSubmit(onSubmitForm)}
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
                data-chainid={assetType.dataChainId}
                {...register('assetType')}
                onChange={handleAssetTypeChange}
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
        <button type="submit" style={{ width: 'fit-content', marginBottom: '15px' }}>
          Submit
        </button>
      </form>
    </div>
  );
}
