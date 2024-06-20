import * as bitcoinLib from 'bitcoinjs-lib';
import canonicalize from 'canonicalize';
import { ethers } from 'ethers';
import { fetchDerivedEVMAddress, fetchDerivedBTCAddressAndPublicKey } from 'multichain-tools';

import { TransactionFormValues } from '../test-app/components/SignMultiChain';

export function toWei(eth: number): bigint {
  return ethers.parseEther(eth.toString());
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

const generateDerivationPath = (chainValue: number, domain?: string): string => canonicalize(domain ? {
  chain: chainValue, domain
} : { chain: chainValue });

export const fetchDerivedAddress = async ({ accountId, chainValue, keyType }: {
  accountId: string, keyType: string, chainValue: number
}): Promise<string> => {
  try {
    if (!accountId) {
      throw new Error('Error: Missing accountId for address generation.');
    }
    const domain = getDomain(keyType);
    const derivationPath = generateDerivationPath(chainValue, domain);
    if (!derivationPath) {
      throw new Error('Error: Missing derivation path for address generation.');
    }

    let address = '';
    if (chainValue === 0) {
      const { address: btcAddress } = await fetchDerivedBTCAddressAndPublicKey(
        accountId,
        derivationPath,
        bitcoinLib.networks.testnet,
        'testnet',
        'v2.multichain-mpc.testnet',
      );
      address = btcAddress;
    } else if (chainValue === 60) {
      address = await fetchDerivedEVMAddress(accountId, derivationPath, 'testnet', 'v2.multichain-mpc.testnet');
    }

    return address;
  } catch (error) {
    console.log('Error fetching derived address ', error);
    return '';
  }
};

export const getTransactionPayload = async (values: TransactionFormValues & { accountId: string }): Promise<Record<string, string | number | bigint>> => {
  const {
    keyType,
    chainId,
    assetType: chainValue,
    amount,
    address,
    accountId
  } = values;
  try {
    const derivedAddress = await fetchDerivedAddress({ accountId, chainValue, keyType });
    const domain = getDomain(keyType);
    const payload: Record<string, string | number | bigint> = {
      chain: chainValue,
      to:    address,
      value: BigInt(getValue(chainValue, amount)),
      from:  derivedAddress,
    };

    if (domain) payload.domain = domain;
    if (chainValue !== 0) payload.chainId = BigInt(chainId);
    else payload.network = 'testnet';

    return payload;
  } catch (error) {
    console.log('Error generating transaction payload ', error);
    return {};
  }
};
