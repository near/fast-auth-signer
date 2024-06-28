import { ethers } from 'ethers';

import { receivingAddresses } from './constants';

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

export async function connectToProvider(): Promise<ethers.JsonRpcProvider> {
  return new ethers.JsonRpcProvider(
    `https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`
  );
}

export function callContractWithDataField(
  functionSignature: string,
  params: string[]
): ethers.TransactionLike['data'] | null {
  const functionSelector = ethers.id(functionSignature).slice(0, 10);
  const encodedParams = ethers.AbiCoder.defaultAbiCoder().encode(
    params.map(() => 'string'),
    params
  );
  const data = functionSelector + encodedParams.slice(2);

  try {
    return data;
  } catch (error) {
    console.error(
      `Error calling ${functionSignature} using data field:`,
      error
    );
    return null;
  }
}

export async function viewCallerDataWithDataField(
  provider: ethers.JsonRpcProvider,
  key: string
): Promise<string> {
  const functionSignature = 'viewCallerData(string)';
  const functionSelector = ethers.id(functionSignature).slice(0, 10);
  const encodedKey = ethers.AbiCoder.defaultAbiCoder().encode(
    ['string'],
    [key]
  );
  const data = functionSelector + encodedKey.slice(2);

  try {
    const result = await provider.call({
      to:   receivingAddresses.ETH_SMART_CONTRACT,
      data,
    });
    const [value] = ethers.AbiCoder.defaultAbiCoder().decode(
      ['string'],
      result
    );
    console.log(`Caller data for key "${key}": ${value}`);
    return value;
  } catch (error) {
    console.error('Error viewing caller data using data field:', error);
    return '';
  }
}
