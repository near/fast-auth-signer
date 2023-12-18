import { ErrorMessage } from '@hookform/error-message';
import React, {
  InputHTMLAttributes, MouseEventHandler, ReactNode, forwardRef
} from 'react';
import { FieldErrors } from 'react-hook-form';
import styled from 'styled-components';

import ErrorSvg from '../../components/CreateAccount/icons/ErrorSvg';
import SuccessSvg from '../../components/CreateAccount/icons/SuccessSvg';
import Badge, { BadgeProps } from '../Badge/Badge';

const InputContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;

  label {
    font-size: 12px;
    font-weight: 500;
  }

  input {
    padding: 8px 12px;
    border: 1px solid #e3e3e0;
    border-radius: 10px;
    height: 40px;
    cursor: text;
    margin-top: 2px;
  }

  .input-badges {
    display: flex;
    gap: 4px;
    margin-top: 8px;
  }

  .input-group-custom {
    display: flex;
    align-items: end;

    &:focus {
      box-shadow: 0px 0px 0px 4px #cbc7f4;
    }
  }

  .input-group-custom.input-group-custom-success {
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

  .input-group-custom input {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    flex: 1;

    &:focus {
      box-shadow: 0;
    }
  }

  .input-group-custom .input-group-right {
    background-color: #f9f9f8;
    border: 1px solid #e3e3e0;
    display: flex;
    padding: 0 1em;
    border-top-right-radius: 10px;
    border-bottom-right-radius: 10px;
    border-left: 0;
    height: 40px;
  }

  .input-group-custom .input-group-right span {
    display: block;
    margin: auto;
    font-size: 16px;
    color: #706f6c;
  }

  .subText {
    font-size: 12px;
    padding: 2px;

    .error {
      display: flex;
      align-items: center;
      color: #a81500;

      svg {
        margin-right: 5px;
      }

      span {
        flex: 1;
      }
    }

    .success {
      display: flex;
      align-items: center;
      color: #197650;

      svg {
        margin-right: 5px;
      }

      span {
        flex: 1;
      }
    }
  }
`;

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  errors?: FieldErrors;
  right?: ReactNode;
  success?: string;
  error?: boolean;
  subText?: string;
  badges?: BadgeProps[];
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  label, errors, name, right, success, error, subText, badges, ...rest
}, ref) => (
  <InputContainer>
    <label htmlFor={name}>{label}</label>
    <div className={`input-group-custom ${success && 'input-group-custom-success'} ${error && 'input-group-custom-failure'}`}>
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
    <div className="subText">
      {subText && <div>{subText}</div>}
      {success && (
        <div className="success">
          <SuccessSvg />
          <span>{success}</span>
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
      {/* <ErrorMessage
          errors={errors}
          name={name}
          render={({ message }) => (
            <div className="error">
              <ErrorSvg />
              <span>{message}</span>
            </div>
          )}
        /> */}
    </div>
  </InputContainer>
));

export default Input;
