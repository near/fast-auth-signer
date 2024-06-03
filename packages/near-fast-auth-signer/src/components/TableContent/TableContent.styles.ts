import styled from 'styled-components';

interface check {
  hasFunctionCall?: boolean;
}

const TableContentWrapper = styled.div.attrs<check>(({ hasFunctionCall }) => {
  return {
    hasFunctionCall,
  };
})`
  display: flex;
  flex-direction: row;
  padding: 16px;
  gap: 8px;
  line-height: 21px;
  font-size: 14px;
  background-color: #fdfdfc;
  justify-content: space-between;
  flex-wrap: ${({ hasFunctionCall }) => (hasFunctionCall ? 'wrap' : 'nowrap')};

  .left-side {
    font-weight: 450;
    letter-spacing: 0.02em;
    text-align: left;
    color: #1b1b1b;
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .right-side {
    text-align: right;

    .delegated {
      .right-side {
        text-decoration: line-through;
        color: var(--Sand-Light-11, var(--Sand-Light-11, #706F6C));
      }

      .currency-value {
        color: var(--Red-Light-10, var(--Red-Light-10, #EE6F5D));
      }
    }

    .function-call {
      display: inline-flex;
      flex-wrap: wrap;
      gap: 6px;
      flex-direction: row;
      color: #1b1b1b;
      column-gap: 8px;

      button {
        color: #604cc8;
        border: 1px solid #e3e3e0;
        border-radius: 50px;
        background-color: #fdfdfc;
        padding: 0px 12px;
        font-family: FK Grotesk SemiMono Trial;
        font-weight: 500;
        line-height: 17px;
        letter-spacing: 0.02em;
        text-align: left;
        display: flex;
        align-items:center;
        justify-content: space-between;
      }
    }
  }

  .function-desc {
    background-color: #f9f9f8;
    padding: 12px;
    overflow-wrap: anywhere;
    width: 100%;
  }

  .left-side {
    font-weight: 450;
    letter-spacing: 0.02em;
    color: #706f6c;
    gap: 4px;
    display: flex;
    flex-direction: row;
    align-content: center;
    flex-wrap: nowrap;
    align-items: center;
  }

  .right-side {
    font-weight: 600;
    color: #1b1b1b;
    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;
    column-gap: 4px;

    small {
      font-size: 12px;
      display: block;
      font-weight: 450;
      line-height: 17px;
      letter-spacing: 0.02em;
      text-align: right;
      color: #1b1b1b;
    }
  }
`;

export default TableContentWrapper;
