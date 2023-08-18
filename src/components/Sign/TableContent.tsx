import * as React from 'react';
import ArrowDownIcon from '../../Images/arrow-down.svg';
import ArrowUpIcon from '../../Images/arrow-up.svg';
import InfoIcon from '../../Images/info.svg';


const TableContent = (props) => {
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
           <InfoIcon/>
          ) : null}
      </div>
      <div className="right-side">
        {props.hasFunctionCall
          ? (
            <div className="button function-call">
              <button type="button">
                {props.rightSide}
                {props.isFunctionCallOpen
                  ?  <ArrowDownIcon/>
                  :  <ArrowUpIcon/>}
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
};

export default TableContent;
