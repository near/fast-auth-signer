import * as React from 'react';

import ArrowDownSvg from '../../Images/arrow-down';
import ArrowUpSvg from '../../Images/arrow-up';
import InfoSvg from '../../Images/info';

function TableContent(props) {
  let classes = '';
  if (props.hasFunctionCall) {
    classes += '-action';
  }
  return (
    <div className={`table-content ${classes}`}>
      <div className="left-side">
        {props.leftSide}
        {props.hasInfo
          ? (
            <InfoSvg />
          ) : null}
      </div>
      <div className="right-side">
        {props.hasFunctionCall
          ? (
            <div className="button function-call">
              <button type="button">
                {props.rightSide}
                {props.isFunctionCallOpen
                  ? <ArrowDownSvg />
                  : <ArrowUpSvg />}
              </button>
            </div>
          )
          : (
            <div>
              {props.rightSide}
              {props.currencyValue ? <small>{props.currencyValue}</small> : null}
            </div>
          )}
      </div>
      {props.isFunctionCallOpen && props.functionDesc
        ? (
          <div className="function-desc">
            {props.functionDesc}
          </div>
        ) : null}
    </div>
  );
}

export default TableContent;
