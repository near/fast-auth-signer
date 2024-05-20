import React, { FormEvent } from 'react';

type SignMultiChainProps = {
  // eslint-disable-next-line no-unused-vars
  onSubmitForm: (values: {keyType: string, chainValue: number, amount: number, chainId: string | bigint}) => void
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

    let chainId: bigint | string = document
      .querySelector('input[name="assetType"]:checked')
      .getAttribute('data-chainid');

    if (Number.isInteger(Number(chainId))) {
      chainId = BigInt(chainId);
    }

    onSubmitForm({
      keyType, chainId, chainValue, amount
    });
  };

  return (
    <div id="multiChain-trnx">
      <h5>Test MultiChain Transactions</h5>
      <form
        style={{ display: 'flex', flexDirection: 'column', gap: 5 }}
        onSubmit={onSubmit}
      >
        <div
          className="radio-group"
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

          <label htmlFor="wrongKey" className="radio-label">
            <input
              type="radio"
              id="wrongKey"
              value="wrongKey"
              name="keyType"
            />
            Wrong Key
          </label>
        </div>

        <div
          className="radio-group"
          style={{ display: 'flex', gap: 3, marginBottom: '5px' }}
        >
          <label htmlFor="eth" className="radio-label">
            <input
              type="radio"
              id="eth"
              value={60}
              data-chainid={BigInt('11155111')}
              name="assetType"
            />
            ETH sepolia
          </label>

          <label htmlFor="bnb" className="radio-label">
            <input
              type="radio"
              id="bnb"
              value={60}
              data-chainid={BigInt('97')}
              name="assetType"
            />
            BNB testnet
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
          className="radio-group"
          style={{ marginBottom: '10px' }}
        >
          <label htmlFor="amount" className="radio-label">
            Amount
            <input
              type="text"
              id="amount"
              name="amount"
              defaultValue={0.02}
              style={{ marginLeft: '3px' }}
            />
          </label>
        </div>
        <button type="submit" style={{ width: 'fit-content' }}>
          Submit
        </button>
      </form>
    </div>
  );
}
