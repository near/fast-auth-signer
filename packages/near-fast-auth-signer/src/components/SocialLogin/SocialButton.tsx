import React from 'react';
import { useSearchParams } from 'react-router-dom';
import styled from 'styled-components';

import { extractQueryParams } from '../../utils';
import { basePath } from '../../utils/config';

const Button = styled.button`
  font-size: 14px;
  font-weight: 600;
  color: var(--sand12);
  background: var(--sand3);
  padding: 8px;
  border: 1px solid var(--sand6);
  display: flex;
  align-items: center;
  width: calc(50% - 4px) !important;
  justify-content: center;
  border-radius: 100px;
  box-sizing: border-box;

  display: flex;
  flex-direction: row;
  gap: 8px;

  ${(props) => (props.disabled
    && `
    cursor: not-allowed;
    color: var(--sand8);
    background: var(--sand3);
    > svg {
      fill: var(--sand8);
    }
    `
  )};
`;

type SocialButtonProps = {
  logoComponent: React.ReactNode;
  label: string;
  disabled?: boolean;
};

const SocialButton: React.FC<SocialButtonProps> = ({
  logoComponent,
  label,
  disabled,
}) => {
  const [searchParams] = useSearchParams();
  const onClick = async () => {
    const paramNames = ['success_url', 'failure_url', 'public_key', 'methodNames', 'contract_id'];
    const params = extractQueryParams(searchParams, paramNames);
    const parsedUrl = new URL(`${window.location.origin}${basePath ? `/${basePath}` : ''}/auth-callback${Object.keys(params).length > 0 ? `?${searchParams.toString()}` : ''}`);
    parsedUrl.searchParams.set('socialLoginName', label.toLocaleLowerCase());
    if (params.public_key) {
      parsedUrl.searchParams.set('public_key_lak', params.public_key);
      parsedUrl.searchParams.delete('public_key');
    }
    window.parent.postMessage({
      type:   'method',
      method: 'query',
      id:     1234,
      params: {
        request_type: 'complete_authentication',
      }
    }, '*');
    window.open(parsedUrl.href, '_parent');
  };

  return (
    <Button onClick={onClick} type="button" disabled={disabled}>
      { logoComponent }
      { label }
    </Button>
  );
};

export default SocialButton;
