/* eslint-disable import/prefer-default-export */
import React from 'react';
import styled from 'styled-components';

const Wrapper = styled.span`
  display: flex;
  width: 50px;
  height: 50px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-left-color: #007fe6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

export function Spinner() {
  return (
    <Wrapper />
  );
}
