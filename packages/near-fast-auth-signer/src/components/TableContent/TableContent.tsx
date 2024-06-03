import * as React from 'react';

import TableContentWrapper from './TableContent.styles';
import ArrowDownSvg from '../../Images/arrow-down';
import ArrowUpSvg from '../../Images/arrow-up';
import InfoSvg from '../../Images/info';
import OpenLinkSvg from '../../Images/open-link';
import { Button } from '../../lib/Button';
import { Tooltip } from '../../lib/Tooltip';

interface TableContentProps {
  hasFunctionCall?: boolean;
  isFunctionCallOpen?: boolean;
  currencyValue?: string;
  functionDesc?: any;
  leftSide?: string | React.ReactElement;
  rightSide?: string| React.ReactElement;
  infoText?: string;
  openLink?: string;
  isDelegated?: boolean
}
function TableContent({
  hasFunctionCall,
  isFunctionCallOpen,
  functionDesc,
  leftSide,
  rightSide,
  currencyValue,
  infoText,
  openLink,
  isDelegated
}: TableContentProps) {
  const [methodDetails, setMethodDetails] = React.useState(false);

  return (
    <TableContentWrapper hasFunctionCall={hasFunctionCall}>
      <div className="left-side">
        {leftSide}
        {infoText && (
          <Tooltip infoText={infoText}>
            <InfoSvg />
          </Tooltip>
        )}
        {/* eslint-disable-next-line */}
        {openLink && <a href={openLink} target="_blank" rel="noreferrer"><OpenLinkSvg /></a>}
      </div>

      <div className="right-side">
        {hasFunctionCall ? (
          <div className="button function-call">
            <Button
              type="button"
              size="small"
              data-test-id="function-call-button"
              onClick={() => setMethodDetails(!methodDetails)}
            >
              {rightSide}
              {isFunctionCallOpen && methodDetails ? (
                <ArrowUpSvg />
              ) : (
                <ArrowDownSvg />
              )}
            </Button>
          </div>
        ) : (
          <div className={`${isDelegated ? 'delegated' : ''}`}>
            <span className="right-side">{rightSide}</span>
            {currencyValue ? <small className="currency-value">{currencyValue}</small> : null}
          </div>
        )}
      </div>
      {isFunctionCallOpen && functionDesc && methodDetails ? (
        <div className="function-desc">
          <pre>
            Arguments:&nbsp;
            {JSON.stringify(JSON.parse(Buffer.from(functionDesc).toString()), null, 2)}
          </pre>
        </div>
      ) : null}
    </TableContentWrapper>
  );
}

export default TableContent;
