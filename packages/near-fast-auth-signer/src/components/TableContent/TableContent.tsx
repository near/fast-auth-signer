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
  isDelegated?: boolean;
  dataTestIds?: {
    wrapper?: string;
    leftSide?: string;
    rightSide?: string;
    rightSideContent?: string;
    currencyValue?: string;
    tooltip?: string;
  };
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
  isDelegated,
  dataTestIds = {}
}: TableContentProps) {
  const [methodDetails, setMethodDetails] = React.useState(false);

  return (
    <TableContentWrapper hasFunctionCall={hasFunctionCall} data-testid={dataTestIds.wrapper}>
      <div className="left-side" data-testid={dataTestIds.leftSide}>
        {leftSide}
        {infoText && (
          <Tooltip infoText={infoText} data-testid={dataTestIds.tooltip}>
            <InfoSvg />
          </Tooltip>
        )}
        {/* eslint-disable-next-line */}
        {openLink && <a href={openLink} target="_blank" rel="noreferrer"><OpenLinkSvg /></a>}
      </div>

      <div className="right-side" data-testid={dataTestIds.rightSide}>
        {hasFunctionCall ? (
          <div className="button function-call">
            <Button
              data-testid="function-call-button"
              type="button"
              size="small"
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
            <span className="right-side" data-testid={dataTestIds.rightSideContent}>{rightSide}</span>
            {currencyValue ? <small className="currency-value" data-testid={dataTestIds.currencyValue}>{currencyValue}</small> : null}
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
