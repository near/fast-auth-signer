import { FacebookAuthProvider, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';
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

type SocialLoginProps = {
  isRecovery?: boolean;
};

function SocialLogin({ isRecovery = false }: SocialLoginProps) {
  // TODO: remove below once mainnet is ready
  if (environment.NETWORK_ID !== 'testnet') return null;

  const googleProvider = new GoogleAuthProvider();
  const facebookProvider = new FacebookAuthProvider();
  const appleProvider = new OAuthProvider('apple.com');

  return (
    <div>
      <Header>Sign in with</Header>
      <Container>
        <SocialButton provider={googleProvider} logoComponent={<GoogleLogoSvg />} label="Google" isRecovery={isRecovery} />
        <SocialButton provider={facebookProvider} logoComponent={<FacebookLogoSvg />} label="Facebook" isRecovery={isRecovery} disabled />
        <SocialButton provider={appleProvider} logoComponent={<AppleLogoSvg />} label="Apple" isRecovery={isRecovery} />
      </Container>
      {/*  */}
    </div>
  );
}

export default SocialLogin;
