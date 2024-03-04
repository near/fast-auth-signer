import React from 'react';
import styled from 'styled-components';

type StyledContainerProps = {
  inIframe?: boolean;
  children: React.ReactNode
}

export const ContainerWrapper = styled.div`
  width: 100%;
  height: 100vh;
  background-color: #f2f1ea;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  padding-bottom: 60px;

  header {
    text-align: center;
    margin-top: 1em;
  }
`;

function StyledContainer({ inIframe, children }: StyledContainerProps) {
  return inIframe ? children : <ContainerWrapper>{children}</ContainerWrapper>;
}

export default StyledContainer;
