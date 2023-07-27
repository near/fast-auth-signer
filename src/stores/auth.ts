/* eslint-disable no-unused-vars */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable import/prefer-default-export */
import type Big from 'big.js';
import { create } from 'zustand';

type AuthState = {
  account: any;
  accountId: string;
  availableStorage: Big | null;
  logOut: () => Promise<void>;
  refreshAllowance: () => Promise<void>;
  requestSignInWithWallet: () => void;
  signedIn: boolean;
};

type AuthStore = AuthState & {
  set: (state: AuthState) => void;
};

export const useAuthStore = create<AuthStore>((set) => {
  return {
    account:                 null,
    accountId:               '',
    availableStorage:        null,
    logOut:                  async () => undefined,
    refreshAllowance:        async () => undefined,
    requestSignInWithWallet: () => undefined,
    signedIn:                false,
    set:                     (state) => set((previousState) => { return { ...previousState, ...state }; }),
  };
});
