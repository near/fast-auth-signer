import React, {
  InputHTMLAttributes, ReactNode, forwardRef
} from 'react';
import { FieldErrors } from 'react-hook-form';
import styled from 'styled-components';

import ErrorSvg from '../../components/CreateAccount/icons/ErrorSvg';
import SuccessSvg from '../../components/CreateAccount/icons/SuccessSvg';
import Badge, { BadgeProps } from '../Badge/Badge';

interface InputContainerProps {
  hasRight?: boolean;
}

const InputContainer = styled.div<InputContainerProps>`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    color: var(--Sand-Light-12, var(--Sand-Light-12, #1B1B18));
    font-size: 12px;
    font-weight: 600;
  }

  input {
    border-radius: 6px;
    border: 1px solid var(--Sand-Light-6, #E3E3E0);
    background: var(--Sand-Light-1, #FDFDFC);
    margin: 0;
    padding: 8px 12px;
    cursor: text;
    ${({ hasRight }) => (hasRight ? `
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
      flex: 1;
    ` : '')}
  }

  .input-badges {
    display: flex;
    gap: 4px;
  }

  .input-group {
    display: flex;
    align-items: end;

    &.success {
      input {
        background-color: #f5fffa;
        color: #197650;
        border-color: #7af5b8;
      }

      .input-group-right {
        background-color: #dcfeed;
        border-color: #7af5b8;

        span {
          color: #197650;
        }
      }
    }

    &.error {
      input {
        background-color: #f5fffa;
        color: #A81500;
        border-color: #FFAFA3;
      }

      .input-group-right {
        background-color: #FFE0DB;
        border-color: #FFAFA3;

        span {
          color: #A81500;
        }
      }
    }

    .input-group-right {
      background-color: #f9f9f8;
      border: 1px solid #e3e3e0;
      display: flex;
      padding: 0 1em;
      border-top-right-radius: 10px;
      border-bottom-right-radius: 10px;
      border-left: 0;
      height: 40px;

      span {
        margin: auto;
        font-size: 16px;
        color: #706f6c;
      }
    }
  }

  .sub-text {
    font-size: 12px;
    padding: 2px;
    
    .message {
      display: flex;
      align-items: center;

      svg {
        margin-right: 5px;
      }

      span {
        flex: 1;
      }
    }

    .error {
      color: #a81500;
      display: flex;
      align-items: center;
      gap: 6px;

      svg {
        flex-shrink: 0;
      }
    }

    .success {
      color: #197650;
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
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  label, errors, name, right, success, error, subText, badges, ...rest
}, ref) => {
  console.log(error);

  const renderMessage = () => {
    if (success) {
      return (
        <div className="message success">
          <SuccessSvg />
          <span>{success}</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="error">
          <ErrorSvg />
          <span>{error}</span>
        </div>
      );
    }

    if (subText) {
      return <div>{subText}</div>;
    }

    return null;
  };

  return (
    <InputContainer hasRight={!!right}>
      <label htmlFor={name}>{label}</label>
      <div className={`input-group ${success ? 'success' : ''} ${error ? 'error' : ''}`}>
        <input
          {...rest}
          name={name}
          ref={ref}
        />
        {right && (
          <div className="input-group-right">
            <span>{right}</span>
          </div>
        )}
      </div>
      {renderMessage() && (
        <div className="sub-text">
          {renderMessage()}
        </div>
      )}
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
});

export default Input;
