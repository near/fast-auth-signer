import React, { MouseEventHandler } from 'react';
import styled from 'styled-components';

type BadgeContainerProps = {
  isSelected?: boolean,
  isClickable?: boolean,
}

const BadgeContainer = styled.div<BadgeContainerProps>`
  border-radius: 50px;
  padding: 8px 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.06);
  font-size: 12px;
  font-weight: 500;

  ${({ isSelected }) => (isSelected ? `
    border: 1px solid var(--Violet-Light-7, #928BE4);
    background: var(--Violet-Light-3, #E3E1F9);
    color: var(--Violet-Light-11, var(--Violet-Light-11, #2A297A));
  ` : `
    border: 1px solid var(--Sand-Light-6, #E3E3E0);
    color: var(--Sand-Light-12, var(--Sand-Light-12, #1B1B18));
    background: var(--White, #FFF);
  `)}

  ${({ isClickable }) => (isClickable ? `
    cursor: pointer;
  ` : '')}
`;

export type BadgeProps = {
  label: string,
  isSelected?: boolean,
  onClick?: MouseEventHandler<HTMLElement>,
}

function Badge({ isSelected, label, onClick }: BadgeProps) {
  return (
    <BadgeContainer
      isSelected={isSelected}
      isClickable={!!onClick}
      onClick={onClick}
    >
      {label}
    </BadgeContainer>
  );
}

export default Badge;
