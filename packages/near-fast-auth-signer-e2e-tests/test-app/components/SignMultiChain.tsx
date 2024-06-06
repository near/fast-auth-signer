import React, { FormEvent } from 'react';

type SignMultiChainProps = {
  // eslint-disable-next-line no-unused-vars
  onSubmitForm: (values: {
    keyType: string,
    chainValue: number,
    amount: number,
    chainId: string,
    address: string}) => void
}
export default function SignMultiChain(props: SignMultiChainProps) {
  const { onSubmitForm } = props;
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.target as HTMLFormElement);

    // Check if keyType and assetType is checked
    const keyTypeChecked = formData.has('keyType');
    const assetTypeChecked = formData.has('assetType');
    const isAmountPresent = formData.has('amount');
    if (!keyTypeChecked || !assetTypeChecked || !isAmountPresent) {
      console.log('Some input fields are missing');
      return;
    }

    const keyType = formData.get('keyType') as string;
    const chainValue = Number(formData.get('assetType'));

    const amount = Number(formData.get('amount'));

    const address = formData.get('address') as string;

    const chainId: bigint | string = document
      .querySelector('input[name="assetType"]:checked')
      .getAttribute('data-chainid');

    onSubmitForm({
      keyType, chainId, chainValue, amount, address
    });
  };

  return (
    <div
      id="multiChain-trnx"
      style={{
        border: '1px solid #ddd', width: 'fit-content', margin: '15px 0'
      }}
    >
      <h5>Sign MultiChain Transactions</h5>
      <form
        style={{
          display: 'flex', flexDirection: 'column', gap: 5, margin: '5px'
        }}
        onSubmit={onSubmit}
      >
        <div
          className="input-group"
          style={{ display: 'flex', gap: 3, marginBottom: '5px' }}
        >
          <label htmlFor="domainKey" className="radio-label">
            <input
              type="radio"
              id="domainKey"
              value="domainKey"
              name="keyType"
            />
            Domain Key
          </label>

          <label htmlFor="personalKey" className="radio-label">
            <input
              type="radio"
              id="personalKey"
              value="personalKey"
              name="keyType"
            />
            Personal Key
          </label>

          <label htmlFor="unknownKey" className="radio-label">
            <input
              type="radio"
              id="unknownKey"
              value="unknownKey"
              name="keyType"
            />
            Unknown Key
          </label>
        </div>

        <div
          className="input-group"
          style={{ display: 'flex', gap: 3, marginBottom: '5px' }}
        >
          <label htmlFor="eth" className="radio-label">
            <input
              type="radio"
              id="eth"
              value={60}
              data-chainid={11155111}
              name="assetType"
            />
            ETH sepolia
          </label>

          <label htmlFor="bnb" className="radio-label">
            <input
              type="radio"
              id="bnb"
              value={60}
              data-chainid={97}
              name="assetType"
            />
            BSC testnet
          </label>

          <label htmlFor="btc" className="radio-label">
            <input
              type="radio"
              id="btc"
              value={0}
              data-chainid="testnet"
              name="assetType"
            />
            BTC testnet
          </label>
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
              name="amount"
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
              name="address"
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
