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

export function callContractWithDataField(
  functionSignature: string,
  params: any[]
): ethers.TransactionLike['data'] | null {
  try {
    const iface = new ethers.Interface([`function ${functionSignature}`]);
    const functionName = functionSignature.split('(')[0];
    const data = iface.encodeFunctionData(functionName, params);
    return data;
  } catch (error) {
    console.error(
      `Error encoding function call for ${functionSignature}:`,
      error
    );
    return null;
  }
}
