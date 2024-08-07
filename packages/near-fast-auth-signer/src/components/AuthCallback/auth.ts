import { KeyPair } from '@near-js/crypto';
import BN from 'bn.js';
import {
  FacebookAuthProvider, GoogleAuthProvider, OAuthProvider, signInWithPopup
} from 'firebase/auth';
import { NavigateFunction } from 'react-router-dom';

import { createNEARAccount, fetchAccountIds } from '../../api';
import { inIframe, isUrlNotJavascriptProtocol } from '../../utils';
import { basePath } from '../../utils/config';
import { NEAR_MAX_ALLOWANCE } from '../../utils/constants';
import { checkFirestoreReady, firebaseAuth } from '../../utils/firebase';
import { getAddKeyAction, getAddLAKAction } from '../../utils/mpc-service';
import { getSocialLoginAccountId } from '../../utils/string';

type BaseParams = {
  accessToken: string;
  publicKeyFak?: string;
  public_key_lak: string;
  contract_id: string;
  methodNames?: string;
  success_url?: string;
  setStatusMessage: (message: string) => void;
  gateway: string;
};

type OnCreateAccountParams = BaseParams & {
  oidcKeypair: KeyPair; // Specific type should be defined based on the structure of oidcKeypair
  accountId: string;
};

type OnSignInParams = BaseParams & {
  searchParams: URLSearchParams;
  navigate: NavigateFunction;
  devicePageCallback?: () => void; // Optional
  onAccountNotFound?: () => void; // Optional
};

export const onCreateAccount = async ({
  oidcKeypair,
  accessToken,
  accountId,
  publicKeyFak,
  public_key_lak,
  contract_id,
  methodNames,
  success_url,
  setStatusMessage,
  gateway,
}: OnCreateAccountParams) => {
  const res = await createNEARAccount({
    accountId,
    fullAccessKeys:    publicKeyFak ? [publicKeyFak] : [],
    limitedAccessKeys: public_key_lak ? [{
      public_key:   public_key_lak,
      receiver_id:  contract_id,
      allowance:    NEAR_MAX_ALLOWANCE,
      method_names: methodNames ?? '',
    }] : [],
    accessToken,
    oidcKeypair,
  });

  if (res.type === 'err') return;

  // Add device
  await window.firestoreController.addDeviceCollection({
    fakPublicKey: publicKeyFak,
    lakPublicKey: public_key_lak,
    gateway,
    accountId
  });

  setStatusMessage('Account created successfully!');

  setStatusMessage('Redirecting to app...');

  const recoveryPK = await window.fastAuthController.getUserCredential(accessToken);
  await window.firestoreController.addAccountIdPublicKey(recoveryPK, accountId);
  const parsedUrl = new URL(
    success_url && isUrlNotJavascriptProtocol(success_url)
      ? success_url
      : window.location.origin + (basePath ? `/${basePath}` : '')
  );
  parsedUrl.searchParams.set('account_id', res.near_account_id);
  parsedUrl.searchParams.set('public_key', public_key_lak);
  parsedUrl.searchParams.set('all_keys', (publicKeyFak ? [public_key_lak, publicKeyFak, recoveryPK] : [public_key_lak, recoveryPK]).join(','));
  window.location.replace(parsedUrl.href);
};

export async function onSignIn({
  accessToken,
  publicKeyFak,
  public_key_lak,
  contract_id,
  methodNames,
  setStatusMessage,
  success_url,
  searchParams,
  navigate,
  gateway,
  devicePageCallback,
  onAccountNotFound
}: OnSignInParams): Promise<void> {
  // Stop from LAK with multi-chain contract
  const recoveryPK = await window.fastAuthController.getUserCredential(accessToken);
  const accountIds = await fetchAccountIds(recoveryPK);
  if (!accountIds.length) {
    onAccountNotFound?.();
    return Promise.resolve();
  }
  // TODO: If we want to remove old LAK automatically, use below code and add deleteKeyActions to signAndSendActionsWithRecoveryKey
  // const existingDevice = await window.firestoreController.getDeviceCollection(publicKeyFak);
  // // delete old lak key attached to webAuthN public Key
  // const deleteKeyActions = existingDevice
  //   ? getDeleteKeysAction(existingDevice.publicKeys.filter((key) => key !== publicKeyFak)) : [];

  // onlyAddLak will be true if current browser already has a FAK with passkey
  const onlyAddLak = !publicKeyFak || publicKeyFak === 'null';
  const baseAction = {
    publicKeyLak: public_key_lak,
    contractId:   contract_id,
    methodNames,
    allowance:    new BN(NEAR_MAX_ALLOWANCE),
  };

  const addKeyActions = onlyAddLak
    ? getAddLAKAction(baseAction)
    : getAddKeyAction({ ...baseAction, webAuthNPublicKey: publicKeyFak });

  return (window as any).fastAuthController.signAndSendActionsWithRecoveryKey({
    oidcToken: accessToken,
    accountId: accountIds[0],
    recoveryPK,
    actions:   addKeyActions
  })
    .then((res) => res.json())
    .then(async (res) => {
      const failure = res['Receipts Outcome']
        .find(({ outcome: { status } }) => Object.keys(status).some((k) => k === 'Failure'))?.outcome?.status?.Failure;
      if (devicePageCallback) {
        devicePageCallback();
      }
      if (failure?.ActionError?.kind?.LackBalanceForState) {
        navigate(`/devices?${searchParams.toString()}`);
      } else {
        await checkFirestoreReady();
        await window.firestoreController.addDeviceCollection({
          fakPublicKey: onlyAddLak ? null : publicKeyFak,
          lakPublicKey: public_key_lak,
          gateway,
          accountId:    accountIds[0],
        });

        setStatusMessage('Account recovered successfully!');

        setStatusMessage('Redirecting to app...');

        const parsedUrl = new URL(
          success_url && isUrlNotJavascriptProtocol(success_url)
            ? success_url
            : window.location.origin + (basePath ? `/${basePath}` : '')
        );
        parsedUrl.searchParams.set('account_id', accountIds[0]);
        parsedUrl.searchParams.set('public_key', public_key_lak);
        parsedUrl.searchParams.set('all_keys', (publicKeyFak ? [public_key_lak, publicKeyFak, recoveryPK] : [public_key_lak, recoveryPK]).join(','));

        if (inIframe()) {
          window.parent.postMessage({
            type:   'method',
            method: 'query',
            id:     1234,
            params: {
              request_type: 'complete_authentication',
              publicKey:    public_key_lak,
              allKeys:      (publicKeyFak ? [public_key_lak, publicKeyFak, recoveryPK] : [public_key_lak, recoveryPK]).join(','),
              accountId:    accountIds[0]
            }
          }, '*');
        } else {
          console.log('else?');
          window.location.replace(parsedUrl.href);
        }
      }
    });
}

const getProvider = (socialName: string) => {
  switch (socialName) {
    case 'google':
      return new GoogleAuthProvider();
    case 'facebook':
      return new FacebookAuthProvider();
    case 'apple':
      return new OAuthProvider('apple.com');
    default:
      return null;
  }
};

const shouldCreateAccount = (createdAt: string, lastLoginAt: string): boolean => {
  const createdTime = new Date(createdAt).getTime();
  const lastLoginTime = new Date(lastLoginAt).getTime();

  const diffInMilliseconds = lastLoginTime - createdTime;
  if (diffInMilliseconds === 0) return true;

  const diffInMinutes = diffInMilliseconds / (1000 * 60);

  return diffInMinutes < 1;
};

export const onSocialLogin = async ({
  socialLoginName
}) => {
  const provider = getProvider(socialLoginName);
  if (!provider) throw new Error('Unsupported social login');
  const response = await signInWithPopup(firebaseAuth, provider);
  const { user } = response;
  const { email } = user;

  const isNewUser = shouldCreateAccount(user.metadata.creationTime, user.metadata.lastSignInTime);
  const accountId = isNewUser ? getSocialLoginAccountId() : null;

  return {
    accountId,
    email,
    isNewUser,
  };
};
