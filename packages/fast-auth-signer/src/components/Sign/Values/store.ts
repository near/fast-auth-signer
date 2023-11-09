import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const store = (set) => {
  return {
    fiatValueUsd:          '',
    storeFetchedUsdValues: (fiatValueUsd) => set({ fiatValueUsd }),
  };
};

const fiatValuesStore = create(devtools(store));

export default fiatValuesStore;
