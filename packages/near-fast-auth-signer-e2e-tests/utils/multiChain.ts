import * as bitcoinLib from 'bitcoinjs-lib';
import canonicalize from 'canonicalize';
import { fetchDerivedEVMAddress, fetchDerivedBTCAddressAndPublicKey } from 'multichain-tools';

export const TESTNET_ADDRESS = '0x7F780C57D846501De4824046EF4c503Ce1c8eAF9';

export function toWei(eth: number): string {
  const wei = eth * 1e18;
  return wei.toString();
}

export function toSatoshis(btc: number): string {
  const satoshis = btc * 1e8;
  return satoshis.toString();
}

export const getDomain = (keyTypeValue: string): string => {
  switch (keyTypeValue) {
    case 'domainKey':
      return window.location.origin;
    case 'wrongKey':
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

const generateDerivationPath = (chainValue: number, domain?: string): string => canonicalize(domain ? {
  chain: chainValue, domain
} : { chain: chainValue });

export const fetchDerivedAddress = async ({ accountId, chainValue, keyType }: {
  accountId: string, keyType: string, chainValue: number
}): Promise<string> => {
  try {
    const domain = getDomain(keyType);
    const derivationPath = generateDerivationPath(chainValue, domain);

    if (!derivationPath || !accountId) {
      throw new Error('Error: Missing derivation path for address generation.');
    }

    let address = '';
    if (chainValue === 0) {
      const { address: btcAddress } = await fetchDerivedBTCAddressAndPublicKey(
        accountId,
        derivationPath,
        bitcoinLib.networks.testnet,
        'testnet',
        'multichain-testnet-2.testnet',
      );
      address = btcAddress;
    } else if (chainValue === 60) {
      address = await fetchDerivedEVMAddress(accountId, derivationPath, 'testnet', 'multichain-testnet-2.testnet');
    }

    return address;
  } catch (error) {
    console.log('Error fetching derived address ', error);
    return '';
  }
};

export const getTransactionPayload = async ({
  keyType,
  chainId,
  chainValue,
  amount
}: {
  keyType: string,
  chainValue: number,
  amount: number,
  chainId: string | bigint
}): Promise<Record<string, string | number | bigint>> => {
  try {
    const accountId = 'harisvalj.testnet';
    const derivedAddress = await fetchDerivedAddress({ accountId, chainValue, keyType });
    const domain = getDomain(keyType);
    let payload: Record<string, string | number | bigint> = {
      chain: chainValue,
      ...(domain ? { domain } : {}),
      to:    TESTNET_ADDRESS,
      value: BigInt(getValue(chainValue, amount)),
      from:  derivedAddress,
    };

    if (chainValue !== 0) {
      payload = { ...payload, chainId: chainId as bigint };
    } else {
      payload = { ...payload, network: 'testnet' };
    }
    return payload;
  } catch (error) {
    console.log('Error generating transaction payload ', error);
    return {};
  }
};
