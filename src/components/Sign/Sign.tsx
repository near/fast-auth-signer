import * as React from 'react';

import TableContent from './table-content';

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
        <svg xmlns="http://www.w3.org/2000/svg" width="49" height="48" viewBox="0 0 49 48" fill="none">
          <rect x="0.5" width="48" height="48" rx="8" fill="black" />
          <path
            d="M29.1452 27.0968V37.1613H39.2097L29.1452 27.0968ZM20.4355 18.3871L24.3839 22.3355L28.371 18.3484V11.0322H20.4355V18.3871ZM20.4355 21.9464V37.1613H28.371V21.9077L24.3839 25.8948L20.4355 21.9464ZM29.629 11.0322H29.1452V17.5761L34.2084 12.5109C32.876 11.5476 31.2732 11.03 29.629 11.0322ZM11.3387 25.0045V37.1613H19.6613V21.1742L17.4161 18.9271L11.3387 25.0045ZM11.3387 21.4471L17.4161 15.3697L19.6613 17.6129V11.0322H11.3387V21.4471ZM37.4677 18.8709C37.4699 17.2268 36.9524 15.624 35.989 14.2916L29.1452 21.1335V26.7097H29.629C31.708 26.7097 33.7018 25.8838 35.1718 24.4137C36.6419 22.9437 37.4677 20.9499 37.4677 18.8709Z"
            fill="white"
          />
          <path d="M33.9839 9.29034L39.2097 14.5162V9.29034H33.9839Z" fill="#00C08B" />
        </svg>
        <h4>Confirm transaction</h4>
        <div className="transaction-details">
          <svg width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M8.5 1.25C7.16498 1.25 5.85994 1.64588 4.7499 2.38758C3.63987 3.12928 2.77471 4.18349 2.26382 5.41689C1.75292 6.65029 1.61925 8.00749 1.8797 9.31686C2.14015 10.6262 2.78303 11.829 3.72703 12.773C4.67104 13.717 5.87377 14.3598 7.18314 14.6203C8.49252 14.8808 9.84971 14.7471 11.0831 14.2362C12.3165 13.7253 13.3707 12.8601 14.1124 11.7501C14.8541 10.6401 15.25 9.33502 15.25 8C15.248 6.2104 14.5362 4.49466 13.2708 3.22922C12.0053 1.96378 10.2896 1.25199 8.5 1.25ZM13.6956 7.25H11.7225C11.6258 5.80909 11.2093 4.40784 10.5031 3.14812C11.3447 3.49713 12.0813 4.05858 12.6409 4.77757C13.2005 5.49656 13.5639 6.34848 13.6956 7.25ZM6.78188 8.75H10.2194C10.0788 10.4181 9.46938 11.9663 8.50125 13.1156C7.52875 11.9663 6.9225 10.4181 6.78188 8.75ZM6.78188 7.25C6.9225 5.58187 7.52875 4.03375 8.5 2.88438C9.47125 4.03375 10.0775 5.58187 10.2181 7.25H6.78188ZM6.5 3.14812C5.79275 4.40758 5.37512 5.80885 5.2775 7.25H3.30438C3.43637 6.34814 3.80025 5.496 4.36041 4.77698C4.92057 4.05796 5.65782 3.4967 6.5 3.14812ZM3.30438 8.75H5.2775C5.37512 10.1911 5.79275 11.5924 6.5 12.8519C5.65782 12.5033 4.92057 11.942 4.36041 11.223C3.80025 10.504 3.43637 9.65186 3.30438 8.75ZM10.5031 12.8519C11.2093 11.5922 11.6258 10.1909 11.7225 8.75H13.6956C13.5639 9.65152 13.2005 10.5034 12.6409 11.2224C12.0813 11.9414 11.3447 12.5029 10.5031 12.8519Z"
              fill="#868682"
            />
          </svg>
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
          {showDetails
            ? (
              <svg width="12" height="7" viewBox="0 0 12 7" fill="none" xmlns="http://www.w3.org/2000/svg">
                {' '}
                <path d="M11.5306 6.53065C11.461 6.60057 11.3782 6.65605 11.287 6.6939C11.1958 6.73176 11.0981 6.75124 10.9994 6.75124C10.9007 6.75124 10.8029 6.73176 10.7118 6.6939C10.6206 6.65605 10.5378 6.60057 10.4681 6.53065L6 2.06252L1.53063 6.53065C1.38973 6.67155 1.19864 6.7507 0.999378 6.7507C0.800121 6.7507 0.609025 6.67155 0.468128 6.53065C0.327232 6.38975 0.248077 6.19866 0.248077 5.9994C0.248077 5.80014 0.327232 5.60905 0.468128 5.46815L5.46813 0.46815C5.53781 0.39823 5.6206 0.342752 5.71176 0.304898C5.80293 0.267044 5.90067 0.247559 5.99938 0.247559C6.09809 0.247559 6.19583 0.267044 6.28699 0.304898C6.37816 0.342752 6.46095 0.39823 6.53063 0.46815L11.5306 5.46815C11.6005 5.53783 11.656 5.62062 11.6939 5.71179C11.7317 5.80295 11.7512 5.90069 11.7512 5.9994C11.7512 6.09811 11.7317 6.19585 11.6939 6.28701C11.656 6.37818 11.6005 6.46097 11.5306 6.53065Z" fill="#1B1B18" />
                {' '}
              </svg>
            )
            : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                {' '}
                <path d="M13.5306 6.53061L8.53063 11.5306C8.46095 11.6005 8.37816 11.656 8.28699 11.6939C8.19583 11.7317 8.09809 11.7512 7.99938 11.7512C7.90067 11.7512 7.80293 11.7317 7.71176 11.6939C7.6206 11.656 7.53781 11.6005 7.46813 11.5306L2.46813 6.53061C2.32723 6.38972 2.24808 6.19862 2.24808 5.99936C2.24808 5.80011 2.32723 5.60901 2.46813 5.46811C2.60902 5.32722 2.80012 5.24806 2.99938 5.24806C3.19864 5.24806 3.38973 5.32722 3.53063 5.46811L8 9.93749L12.4694 5.46749C12.6103 5.32659 12.8014 5.24744 13.0006 5.24744C13.1999 5.24744 13.391 5.32659 13.5319 5.46749C13.6728 5.60838 13.7519 5.79948 13.7519 5.99874C13.7519 6.198 13.6728 6.38909 13.5319 6.52999L13.5306 6.53061Z" fill="#1B1B18" />
                {' '}
              </svg>
            )}
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
