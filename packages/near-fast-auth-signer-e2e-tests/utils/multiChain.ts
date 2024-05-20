export type Asset = {
  label: string;
  value: number;
  chainId: bigint | string;
  code: string;
};

export const assets: Asset[] = [
  {
    label:          'ETH sepolia',
    value:          60,
    chainId:        BigInt('11155111'),
    code:           'ETH',
  },
  {
    label:          'BNB testnet',
    value:          60,
    chainId:        BigInt('97'),
    code:           'BNB',
  },
  {
    label:          'BTC testnet',
    value:          0,
    chainId:        'testnet',
    code:           'BTC',
  },
];

export const getDomain = (keyTypeValue: string): string => {
  if (keyTypeValue === 'domainKey') {
    return window.location.origin;
  } if (keyTypeValue === 'wrongKey') {
    return 'https://app.unknowndomain.com';
  }
  return '';
};
