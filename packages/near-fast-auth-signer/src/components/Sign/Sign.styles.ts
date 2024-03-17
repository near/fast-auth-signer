import styled from 'styled-components';

export const ModalSignWrapper = styled.div`
  width: 550px;
  margin: 0 auto;
  border-radius: 8px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  position: relative;
  row-gap: 8px;
    .info-text {
    font-size: 12px;
    font-weight: 500;
    color: #1b1b1b;
    text-align: center;
      &.error {
        color: #A81500;
      }
    }

  .modal-top {
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: center;
    line-height: 17px;
    text-align: center;
    svg {
      height: 48px;
      width:48px;
    }
    .transaction-details {
      display: inline-flex;
      gap: 6px;
      padding: 8px 12px;
      border-radius: 50px;
      border: 1px solid #e3e3e0;
      align-items: center;
      font-family: Mona Sans;
      font-size: 12px;
      font-weight: 450;
      line-height: 17px;
      letter-spacing: 0.02em;
      text-align: left;
      color: #1b1b1b;
      margin-bottom: 24px;
      svg {
        height: 13.5px;
        width: 13.5px;
        vertical-align: middle;
        color: #868682;
      }
    }
  }

  .table-wrapper {
    background-color: #fdfdfc;
    border: 1px solid #eeeeec;
    border-radius: 4px;

    &.margin-top {
      margin-top: 20px;
    }

    h4 {
      font-size: 12px;
      font-weight: 600;
      line-height: 17px;
      letter-spacing: 0.02em;
      text-align: left;
      color: #1b1b1b;
      padding: 12px;
    }
  }

  .more-details {
    font-size: 14px;
    color: #1b1b1b;
    font-weight: 600;
    line-height: 21px;
    letter-spacing: 0.02em;
    text-align: left;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 8px 16px 0px;
    svg path {
      fill: #1b1b1b;;
    }
    &:hover {
      cursor: pointer;
    }
  }

  .more-details-opened {
    .table-wrapper {
      &:first-child {
        border-bottom-left-radius: 0px;
        border-bottom-right-radius: 0px;
      }

      &:last-child {
        border-top-left-radius: 0px;
        border-top-right-radius: 0px;

        border-top: 0px;
      }
    }
  }

  .modal-footer {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;

    > button {
      min-width: 100%;
    }
  }
`;
