/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/react-in-jsx-scope */
/* eslint-disable import/no-extraneous-dependencies */
import * as ToastPrimitive from '@radix-ui/react-toast';
import type { ComponentProps } from 'react';
import React, { forwardRef } from 'react';

import * as S from './styles';

type CloseButtonProps = ComponentProps<typeof S.CloseButton>;

export const { Root } = S;
export const { Title } = S;
export const { Description } = S;
export const { Content } = S;
export const { Viewport } = S;
export const { Action } = ToastPrimitive;
export const { Provider } = ToastPrimitive;
export const { Close } = ToastPrimitive;

export const CloseButton = forwardRef<HTMLButtonElement, CloseButtonProps>((props, ref) => (
  <S.CloseButton aria-label="Close" ref={ref} {...props}>
    <i className="ph-bold ph-x" />
  </S.CloseButton>
));
CloseButton.displayName = 'CloseButton';
