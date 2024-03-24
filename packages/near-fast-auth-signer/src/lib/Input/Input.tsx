import debounce from 'lodash.debounce';
import React, { InputHTMLAttributes, ReactNode, forwardRef } from 'react';
import { FieldErrors } from 'react-hook-form';
import styled from 'styled-components';

import ErrorSvg from '../../components/CreateAccount/icons/ErrorSvg';
import SuccessSvg from '../../components/CreateAccount/icons/SuccessSvg';
import Badge, { BadgeProps } from '../Badge/Badge';

interface InputContainerProps {
  $hasRight?: boolean;
  $isError?: boolean;
  $isSuccess?: boolean;
}

const InputContainer = styled.div<InputContainerProps>`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    font-size: 12px;
    font-weight: 600;
    color: var(--Sand-Light-12, var(--Sand-Light-12, #1b1b18));
  }

  input {
    border-radius: 6px;
    margin: 0;
    padding: 8px 12px;
    cursor: text;
    background: var(--Sand-Light-1, #fdfdfc);
    border: 1px solid var(--Sand-Light-6, #e3e3e0);
    ${({ $hasRight }) => ($hasRight
    ? `
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
      flex: 1;
    `
    : '')}
  }

  .input-badges {
    display: flex;
    gap: 4px;
  }

  .input-group {
    display: flex;
    align-items: stretch;

    .input-group-right {
      display: flex;
      padding: 0 1em;
      border-top-right-radius: 10px;
      border-bottom-right-radius: 10px;
      border-left: 0;
      background-color: #f9f9f8;
      border: 1px solid #e3e3e0;

      span {
        margin: auto;
        font-size: 16px;
        color: #706f6c;
      }
    }
  }

  ${({ $isError, $isSuccess }) => {
    if ($isError) {
      return `
              label {
                color: var(--Red-Light-12, var(--Red-Light-12, #4B0B02));
              }

              input {
                background-color: #f5fffa;
                color: #A81500;
                border-color: #FFAFA3;
              }

              .input-group {
                .input-group-right {
                  background-color: #FFE0DB;
                  border: 1px solid #FFAFA3;

                  span {
                    color: #A81500;
                  }
                }
              }
            `;
    }

    if ($isSuccess) {
      return `
              input {
                background-color: #f5fffa;
                color: #197650;
                border-color: #7af5b8;
              }

              .input-group {
                .input-group-right {
                  background-color: #dcfeed;

                  border: 1px solid #7af5b8;

                  span {
                    color: #197650;
                  }
                }
              }
            `;
    }

    return '';
  }}

  .sub-text {
    font-size: 12px;

    .stats-message {
      display: flex;
      align-items: center;
      gap: 6px;

      span {
        flex: 1;
      }

      svg {
        flex-shrink: 0;
      }

      &.error {
        color: #a81500;
      }

      &.success {
        color: #197650;
      }
    }
  }
`;

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  errors?: FieldErrors;
  right?: ReactNode;
  success?: string;
  error?: string;
  subText?: string;
  badges?: BadgeProps[];
  debounceTime?: number;
  dataTest?: {
    input?: string;
    error?: string;
    success?: string;
  }
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label, name, right, success, error, subText, badges, debounceTime, dataTest, ...rest
    },
    ref
  ) => {
    const renderMessage = () => {
      if (success) {
        return (
          <div className="stats-message success">
            <SuccessSvg />
            <span data-test-id={dataTest?.success}>{success}</span>
          </div>
        );
      }

      if (error) {
        return (
          <div className="stats-message error">
            <ErrorSvg />
            <span data-test-id={dataTest?.error}>{error}</span>
          </div>
        );
      }

      if (subText) {
        return <div>{subText}</div>;
      }

      return null;
    };

    return (
      <InputContainer
        $hasRight={!!right}
        $isError={!!error}
        $isSuccess={!!success}
      >
        {label && <label htmlFor={name}>{label}</label>}
        <div className="input-group">
          <input
            {...rest}
            name={name}
            ref={ref}
            data-test-id={dataTest?.input}
            {...debounceTime ? { onChange: debounce(rest.onChange, debounceTime) } : {}}
          />
          {right && (
            <div className="input-group-right">
              <span>{right}</span>
            </div>
          )}
        </div>
        {renderMessage() && <div className="sub-text">{renderMessage()}</div>}
        {badges && (
          <div className="input-badges">
            {badges?.map((b) => (
              <Badge
                isSelected={b.isSelected}
                label={b.label}
                onClick={b.onClick}
              />
            ))}
          </div>
        )}
      </InputContainer>
    );
  }
);

export default Input;
