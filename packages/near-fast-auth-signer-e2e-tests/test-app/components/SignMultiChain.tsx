import React from 'react';

export default function SignMultiChain() {
  return (
    <div id="multiChain-trnx">
      <h5>Test MultiChain Transactions</h5>
      <form style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>

        <div className="radio-group" style={{ display: 'flex', gap: 3, marginBottom: '5px' }}>
          <label htmlFor="domainKey" className="radio-label">
            <input type="radio" id="domainKey" value="domainKey" name="keyType" />
            Domain Key
          </label>

          <label htmlFor="personalKey" className="radio-label">
            <input type="radio" id="personalKey" value="personalKey" name="keyType" />
            Personal Key
          </label>

          <label htmlFor="wrongKey" className="radio-label">
            <input type="radio" id="wrongKey" value="wrongKey" name="keyType" />
            Wrong Key
          </label>
        </div>

        <div className="radio-group" style={{ display: 'flex', gap: 3, marginBottom: '5px' }}>
          <label htmlFor="ethSepolia" className="radio-label">
            <input type="radio" id="ethSepolia" value={60} data-chainId={BigInt('11155111')} name="assetType" />
            ETH sepolia
          </label>

          <label htmlFor="bnbTestnet" className="radio-label">
            <input type="radio" id="bnbTestnet" value={60} data-chainId={BigInt('97')} name="assetType" />
            BNB testnet
          </label>

          <label htmlFor="btcTestnet" className="radio-label">
            <input type="radio" id="btcTestnet" value={0} data-chainId="testnet" name="assetType" />
            BTC testnet
          </label>
        </div>
        <button type="submit">Submit</button>

      </form>
    </div>
  );
}
