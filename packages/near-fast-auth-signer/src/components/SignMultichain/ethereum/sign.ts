import { Common } from '@ethereumjs/common';
import { FeeMarketEIP1559Transaction } from '@ethereumjs/tx';
import { borshSerialize } from 'borsher';
import { ethers, formatEther } from 'ethers';

import { derivationPathSchema } from '../schema';
// eslint-disable-next-line import/no-cycle
import { deriveChildPublicKey, najPublicKeyStrToUncompressedHexPoint, uncompressedHexPointToEvmAddress } from '../utils';

// TODO: potentially move to env
const ETH_PROVIDER_GOERLI = 'https://goerli.infura.io/v3/2017d69af37b4f87ad93e8b5ed41b135';
const ETH_PROVIDER_SEPOLIA = 'https://sepolia.infura.io/v3/2017d69af37b4f87ad93e8b5ed41b135';

const getEthProvider = (chainId): string => {
  if (Number(chainId) === 5) {
    return ETH_PROVIDER_GOERLI;
  }
  if (Number(chainId) === 11155111) {
    return ETH_PROVIDER_SEPOLIA;
  }
  return null;
};

export const getEthereumGasFee = async ({
  chainId,
  usdCostOfEth,
}) => {
  const provider = new ethers.JsonRpcProvider(getEthProvider(chainId));
  const feeData = await provider.getFeeData();

  // Total cost in wei (BigInt for precision)
  const totalGasFeeWei = feeData.gasPrice * BigInt(21000);
  // Convert total cost to ether (for a more understandable unit)
  const totalGasFeeEth = formatEther(totalGasFeeWei);
  // Calculate gas fee in USD
  const gasFeeInUSD = parseFloat(totalGasFeeEth) * usdCostOfEth;
  return Math.ceil(gasFeeInUSD * 100) / 100;
};

export const getEthereumMessageToSign = async ({ najPublicKeyStr, message, deserializedDerivationPath }) => {
  const publicKey = await deriveChildPublicKey(
    najPublicKeyStrToUncompressedHexPoint(najPublicKeyStr),
    message.nearAccountId,
    borshSerialize(derivationPathSchema, { asset: 'ETH', nearAccountId: deserializedDerivationPath.nearAccountId }).toString('base64')
  );
  const derivedEthAddress = uncompressedHexPointToEvmAddress(publicKey);
  const provider = new ethers.JsonRpcProvider(getEthProvider(message.chainId));
  const feeData = await provider.getFeeData();
  const common = new Common({ chain: message.chainId, hardfork: 'london' });
  const transaction = FeeMarketEIP1559Transaction.fromTxData({
    to:                   message.to,
    value:                ethers.parseUnits('0.01', 'ether'),
    chainId:              common.chainId(),
    gasLimit:             21000,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
    maxFeePerGas:         feeData.maxFeePerGas,
    nonce:                await provider.getTransactionCount(derivedEthAddress),
  }, {
    common
  });

  return transaction.getHashedMessageToSign();
};
