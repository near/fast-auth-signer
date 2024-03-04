import React from 'react';
import styled from 'styled-components';

import type { Props } from './Button';
import CrossSvg from '../../Images/cross';

const Button = styled.button`
  position: absolute;
  width: 40px;
  top: 10px;
  right: 0;
  background: transparent;
  border: none;
  outline: none;
  box-shadow: none;
`;

export function CloseButton(props: Props) {
  return (<Button {...props}><CrossSvg /></Button>);
}
