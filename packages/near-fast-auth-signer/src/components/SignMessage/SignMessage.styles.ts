import styled from 'styled-components';

export const Message = styled.div`
  width: 100%;

  p {
    margin: 0;
  }

  & > .title {
    margin-bottom: 12px;
  }

  & > .message {
    width: 100%;
    padding: 12px;
    background: var(--Sand-Light-2, #F9F9F8);
    border-radius: 6px;
    color: var(--Sand-Light-12, #1B1B18);
    font-size: 14px;
  }
`;
