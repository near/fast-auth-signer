import { FacebookAuthProvider, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';

import { setAccountIdToController } from '../../lib/controller';
import FirestoreController from '../../lib/firestoreController';
import { decodeIfTruthy } from '../../utils';
import { networkId } from '../../utils/config';
import { firebaseAuth } from '../../utils/firebase';
import { storePassKeyAsFAK } from '../../utils/passkey';
import { getSocialLoginAccountId } from '../../utils/string';
import { onCreateAccount, onSignIn } from '../AuthCallback/AuthCallback';

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
    opacity: 0.5;
    color: #72727A;
    `
  )};

`;

type SocialButtonProps = {
  provider: GoogleAuthProvider | FacebookAuthProvider;
  logoComponent: React.ReactNode;
  label: string;
  isRecovery: boolean;
  disabled?: boolean;
};

const shouldCreateAccount = (createdAt: string, lastLoginAt: string): boolean => {
  const createdTime = new Date(createdAt).getTime();
  const lastLoginTime = new Date(lastLoginAt).getTime();

  const diffInMilliseconds = lastLoginTime - createdTime;
  if (diffInMilliseconds === 0) return true;

  const diffInMinutes = diffInMilliseconds / (1000 * 60);

  return diffInMinutes < 1;
};

function SocialButton({
  provider,
  logoComponent,
  label,
  isRecovery,
  disabled,
}: SocialButtonProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const onClick = async () => {
    try {
      const result = await signInWithPopup(firebaseAuth, provider);
      const { user } = result;

      // TODO: construct accountId, confirm with UX
      const accountId = getSocialLoginAccountId();
      const { email } = user;

      const success_url = decodeIfTruthy(searchParams.get('success_url'));
      const public_key_lak = decodeIfTruthy(searchParams.get('public_key_lak'));
      const contract_id = decodeIfTruthy(searchParams.get('contract_id'));
      const methodNames = decodeIfTruthy(searchParams.get('methodNames'));
      const accessToken = await user.getIdToken();

      setAccountIdToController({ accountId, networkId });

      const publicKeyFak = await storePassKeyAsFAK(email);
      if (!window.fastAuthController.getAccountId()) {
        await window.fastAuthController.setAccountId(accountId);
      }

      await window.fastAuthController.claimOidcToken(accessToken);
      const oidcKeypair = await window.fastAuthController.getKey(`oidc_keypair_${accessToken}`);

      if (!window.firestoreController) {
        window.firestoreController = new FirestoreController();
      }

      window.firestoreController.updateUser({
        userUid:   user.uid,
        oidcToken: accessToken,
      });

      const isNewUser = shouldCreateAccount(user.metadata.creationTime, user.metadata.lastSignInTime);
      let callback;
      if (isNewUser) {
        callback = onCreateAccount;
      } else if (isRecovery) {
        callback = onSignIn;
      } else {
        callback = onCreateAccount;
      }

      await callback({
        oidcKeypair,
        accessToken,
        accountId,
        publicKeyFak,
        public_key_lak,
        contract_id,
        methodNames,
        success_url,
        setStatusMessage: () => {},
        navigate,
        searchParams,
        gateway:          success_url,
      });
    } catch (error) {
      // Handle errors here
      console.error(error);
    }
  };
  return (
    <Button onClick={onClick} type="button" disabled={disabled}>
      { logoComponent }
      { label }
    </Button>
  );
}

export default SocialButton;
