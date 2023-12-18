import React, { MouseEventHandler } from 'react';
import styled from 'styled-components';

const BadgeContainer = styled.div`
  border-radius: 50px;
  border: 1px solid var(--Sand-Light-6, #E3E3E0);
  padding: 8px 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.06);
  color: var(--Sand-Light-12, var(--Sand-Light-12, #1B1B18));
  font-size: 12px;
  font-weight: 500;

  &.badge-selected {
    background-color: #E3E1F9;
    border-color: #928BE4;
  }

  &.badge-clickable {
    cursor: pointer;
  }

  &:hover {
    background-color: #F3F3F2;
  }
`;

export type BadgeProps = {
  label: string,
  isSelected?: boolean,
  onClick?: MouseEventHandler<HTMLElement>,
}

function Badge({ isSelected, label, onClick }: BadgeProps) {
  return (
    <BadgeContainer
      className={`
        ${isSelected ? 'badge-selected' : ''}
        ${onClick ? 'badge-clickable' : ''}
      `}
      onClick={onClick}
    >
      {label}
    </BadgeContainer>
  );
}

export default Badge;
