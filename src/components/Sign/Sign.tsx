import * as React from 'react';

import TableContent from './TableContent';
import ArrowDownSvg from '../../Images/arrow-down';
import ArrowUpSvg from '../../Images/arrow-up';
import InternetSvg from '../../Images/Internet';
import RefLogoSvg from '../../Images/ref-logo';

/* const mockupData = [
  {
    username:     'perpul.near',
    total:        20.0000,
    usdTotal:     0.0001,
    feeLimit:     500,
    feeEstimated: 0.0001,
    actions:      [
      {
        id:           1,
        title:        'v2.ref-finance.near',
        url:          'near.com',
        functionName: 'swap',
        actionCode:   '{  "actions": [    {      "amount_in": "3872854309082031250000000",      "min_amount_out": "0",      "pool_id": 1395,      "token_in": "wrap.near",      "token_out": "aaaaaa20d9e0e2461697782ef11675f668207961.factory.bridge.near"    },    {      "min_amount_out": "0",      "pool_id": 3042,      "token_in": "aaaaaa20d9e0e2461697782ef11675f668207961.factory.bridge.near",      "token_out": "marmaj.tkn.near"    },    {      "min_amount_out": "0",      "pool_id": 553,      "token_in": "marmaj.tkn.near",      "token_out": "meta-pool.near"    },    {      "min_amount_out": "3872854309082031250000000",      "pool_id": 3514,      "token_in": "meta-pool.near",      "token_out": "wrap.near"    }  ]}'
      }
    ]
  }
];
*/
function Sign() {
  const [showDetails, setShowDetails] = React.useState(false);
  return (
    <div className="modal-sign">
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
            rightSide="perpul.near"
          />
          <TableContent
            leftSide="Total"
            hasInfo
            rightSide="20 NEAR"
            currencyValue="$38.92"
          />
        </div>
      </div>
      <div className="more-details" onClick={() => setShowDetails(!showDetails)}>
        More details
        <span>
          { showDetails ? <ArrowUpSvg /> : <ArrowDownSvg /> }
        </span>
      </div>
      {showDetails
        ? (
          <div className="more-details-opened">
            <div className="table-wrapper">
              <h4>Network fees</h4>
              <TableContent
                leftSide="Fee limit"
                rightSide="500 Tgas"
              />
              <TableContent
                leftSide="Estimated Fees"
                hasInfo
                rightSide="< 0.0001 NEAR"
                currencyValue="< $0.01"
              />
            </div>
            <div className="table-wrapper">
              <h4>Actions</h4>
              <TableContent
                leftSide="v2.ref-finance.near"
                hasFunctionCall
                isFunctionCallOpen
                rightSide="function name"
                functionDesc={'{ "actions": [ { "amount_in": "3872854309082031250000000", "min_amount_out": "0", "pool_id": 1395, "token_in": "wrap.near", "token_out": "aaaaaa20d9e0e2461697782ef11675f668207961.factory.bridge.near" }, { "min_amount_out": "0", "pool_id": 3042, "token_in": "aaaaaa20d9e0e2461697782ef11675f668207961.factory.bridge.near", "token_out": "marmaj.tkn.near" }, { "min_amount_out": "0", "pool_id": 553, "token_in": "marmaj.tkn.near", "token_out": "meta-pool.near" }, { "min_amount_out": "3872854309082031250000000", "pool_id": 3514, "token_in": "meta-pool.near", "token_out": "wrap.near" } ] }'}
              />
            </div>
          </div>
        )
        : null}
      <div className="modal-footer">
        <button type="button" className="button primary">Confirm</button>
        <button type="button" className="button secondary">Cancel</button>
      </div>
    </div>
  );
}

export default Sign;
