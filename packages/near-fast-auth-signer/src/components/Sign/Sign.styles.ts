import styled from 'styled-components';

interface ModalSignWrapperProps {
  hide?: boolean | undefined;
  warning?: boolean | undefined;
}

export const ModalSignWrapper = styled.div<ModalSignWrapperProps>`
  ${(props) => props.hide && 'opacity: 0;'}
  max-height: 660px;
  width: 550px;
  margin: 0 auto;
  border-radius: 8px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;

  .modal-body {
    height: 100%;
    width: 100%;
    overflow: scroll;

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
      gap: 16px;
      align-items: center;
      line-height: 17px;
      text-align: center;

      h4 { 
        font-size: 24px;
        font-weight: 700;
      }

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
        ${({ warning }) => warning && `
          border: 1px solid var(--Red-Light-6, #FF988A);
          background: var(--Red-Light-1, #FFF6F5);
          color: var(--Red-Light-12, var(--Red-Light-12, #4B0B02));
        `}
        svg {
          height: 13.5px;
          width: 13.5px;
          vertical-align: middle;
          color: #868682;
        }
      }
    }

    .modal-middle {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .table-wrapper {
      background-color: #fdfdfc;
      border: 1px solid #eeeeec;
      border-radius: 6px;

      & > *:first-child {
        border-top-left-radius: 6px;
        border-top-right-radius: 6px;
      }
      
      & > *:last-child {
        border-bottom-left-radius: 6px;
        border-bottom-right-radius: 6px;
      }

      > *:not(:last-child) {
        border-bottom: 1px solid var(--Sand-Light-4, #EEEEEC);
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
      svg path {
        fill: #1b1b1b;;
      }
      &:hover {
        cursor: pointer;
      }
    }

    .more-details {
      margin: 16px 0;
    }

    .more-details-opened {
      overflow: scroll;
    }

    & > button{
      margin-top: 24px;
      width: 100%;
    }
  }
`;
