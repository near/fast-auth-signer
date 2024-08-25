import React from 'react';
import styled from 'styled-components';

import AppleLogoSvg from './logo/AppleLogoSvg';
import FacebookLogoSvg from './logo/FacebookLogoSvg';
import GoogleLogoSvg from './logo/GoogleLogoSvg';
import SocialButton from './SocialButton';
import environment from '../../utils/environment';

const Header = styled.label`
  font-size: 12px;
  font-weight: 600;
  color: var(--Sand-Light-12, var(--Sand-Light-12, #1b1b18));
  margin-bottom: 8px;
`;

const Container = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
`;

const SocialLogin: React.FC = () => {
  // TODO: remove below once mainnet is ready
  if (environment.NETWORK_ID !== 'testnet') return null;

  return (
    <>
      <Header>Sign in with</Header>
      <Container>
        <SocialButton logoComponent={<GoogleLogoSvg />} label="Google" />
        <SocialButton logoComponent={<FacebookLogoSvg />} label="Facebook" disabled />
        <SocialButton logoComponent={<AppleLogoSvg />} label="Apple" />
      </Container>
    </>
  );
};

export default SocialLogin;
