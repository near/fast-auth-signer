import { ethers } from 'ethers';

export function toWei(eth: number): string {
  return ethers.parseEther(eth.toString()).toString();
}

export function toSatoshis(btc: number): string {
  const satoshis = btc * 1e8;
  return satoshis.toString();
}

export const getDomain = (keyTypeValue: string): string => {
  switch (keyTypeValue) {
    case 'domainKey':
      return window.location.origin;
    case 'unknownKey':
      return 'https://app.unknowndomain.com';
    default:
      return '';
  }
};

export const getValue = (assetTypeValue: number, amount: number): string => {
  if (assetTypeValue === 0) {
    return toSatoshis(amount).toString();
  } if (assetTypeValue === 60) {
    return toWei(amount).toString();
  }
  return '';
};
