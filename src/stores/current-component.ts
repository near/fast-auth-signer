/* eslint-disable import/prefer-default-export */
/* eslint-disable no-unused-vars */
/* eslint-disable import/no-extraneous-dependencies */
import { create } from 'zustand';

type CurrentComponentStore = {
  src: string | null;
  setSrc: (src: string | null) => void;
};

export const useCurrentComponentStore = create<CurrentComponentStore>((set) => {
  return {
    src:    null,
    setSrc: (src) => set(() => { return { src }; }),
  };
});
