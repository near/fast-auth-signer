import { actionCreators, encodeSignedDelegate } from '@near-js/transactions';
import { DEFAULT_FUNCTION_CALL_GAS } from '@near-js/utils';
import BN from 'bn.js';
import bs58check from 'bs58check';
import { ec as EC } from 'elliptic';
import { formatEther } from 'ethers';
import hash from 'hash.js';
import keccak from 'keccak';
import { base_decode } from 'near-api-js/lib/utils/serialize';

import { ethereumSchema } from './ethereum/schema';
// eslint-disable-next-line import/no-cycle
import { getEthereumGasFee, getEthereumMessageToSign } from './ethereum/sign';
import { MultichainIframeMessage, DerivationPathDeserialized } from './types';
import { fetchGeckoPrices } from '../Sign/Values/fiatValueManager';

// TODO: use this for blacklisting on limited access key creation AND sign
const MULTICHAIN_CONTRACT_TESTNET = 'multichain-testnet-2.testnet';
const MULTICHAIN_CONTRACT_MAINNET = 'multichain-testnet-2.testnet';

export const getMultiChainContract = () => (process.env.NETWORK_ID === 'mainnet' ? MULTICHAIN_CONTRACT_MAINNET : MULTICHAIN_CONTRACT_TESTNET);

const getSchema = (asset: DerivationPathDeserialized['asset']) => {
  switch (asset) {
    case 'ETH':
      return ethereumSchema;
    default:
      return null;
  }
};

export const validateMessage = async (message: MultichainIframeMessage, asset: DerivationPathDeserialized['asset']): Promise<boolean
| Error> => {
  const schema = getSchema(asset);
  if (!schema) {
    throw new Error(`Schema for asset ${asset} is not defined`);
  }

  try {
    await schema.validate(message);
    return true;
  } catch (e) {
    throw new Error(e);
  }
};

export const najPublicKeyStrToUncompressedHexPoint = (najPublicKeyStr) => `04${base_decode(najPublicKeyStr.split(':')[1]).toString('hex')}`;

export const sha256Hash = async (str) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);

  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};

export const sha256StringToScalarLittleEndian = (hashString) => {
  const littleEndianString = hashString.match(/../g).reverse().join('');

  const scalar = new BN(littleEndianString, 16);

  return scalar;
};

export const deriveChildPublicKey = async (
  parentUncompressedPublicKeyHex,
  signerId,
  path = ''
) => {
  const ec = new EC('secp256k1');
  const scalar = await sha256Hash(
    `near-mpc-recovery v0.1.0 epsilon derivation:${signerId},${path}`
  );
  const scalarLittleEndian = sha256StringToScalarLittleEndian(scalar);

  const x = parentUncompressedPublicKeyHex.substring(2, 66);
  const y = parentUncompressedPublicKeyHex.substring(66);

  // Create a point object from X and Y coordinates
  const oldPublicKeyPoint = ec.curve.point(x, y);

  // Multiply the scalar by the generator point G
  const scalarTimesG = ec.g.mul(scalarLittleEndian);

  // Add the result to the old public key point
  const newPublicKeyPoint = oldPublicKeyPoint.add(scalarTimesG);

  return `04${
    newPublicKeyPoint.getX().toString('hex').padStart(64, '0')
    + newPublicKeyPoint.getY().toString('hex').padStart(64, '0')}`;
};

export const uncompressedHexPointToEvmAddress = (uncompressedHexPoint) => {
  const address = keccak('keccak256')
    .update(Buffer.from(uncompressedHexPoint.substring(2), 'hex'))
    .digest('hex');

  // Ethereum address is last 20 bytes of hash (40 characters), prefixed with 0x
  return `0x${address.substring(address.length - 40)}`;
};

export const uncompressedHexPointToBtcAddress = async (publicKeyHex) => {
  const publicKeyBytes = Uint8Array.from(Buffer.from(publicKeyHex, 'hex'));

  const sha256HashOutput = await crypto.subtle.digest(
    'SHA-256',
    publicKeyBytes
  );

  const ripemd160 = hash
    .ripemd160()
    .update(Buffer.from(sha256HashOutput))
    .digest();

  const networkByte = Buffer.from([0x00]);
  const networkByteAndRipemd160 = Buffer.concat([
    networkByte,
    Buffer.from(ripemd160)
  ]);

  const address = bs58check.encode(networkByteAndRipemd160);

  return address;
};

type SignedDelegateBase64 = {
  najPublicKeyStr: string;
  message: MultichainIframeMessage;
  deserializedDerivationPath: DerivationPathDeserialized;
}

export const getSignedDelegateBase64 = async ({
  najPublicKeyStr, message, deserializedDerivationPath
}:SignedDelegateBase64) => {
  const getMessage = async () => {
    switch (deserializedDerivationPath.asset) {
      case 'ETH':
        return getEthereumMessageToSign({
          najPublicKeyStr,
          message,
          deserializedDerivationPath
        });
      default:
        return null;
    }
  };

  const messageToSign = await getMessage();

  const fncall = actionCreators.functionCall('sign', {
    payload: Array.from(messageToSign),
    path:    message.derivationPath,
  }, DEFAULT_FUNCTION_CALL_GAS, new BN('0'));

  const controller = window.fastAuthController;
  const signedDelegate = await controller.signDelegateAction({
    receiverId:     getMultiChainContract(),
    actions:        [fncall],
    signerId:       controller.getAccountId(),
  });

  return Buffer.from(encodeSignedDelegate(signedDelegate)).toString(
    'base64'
  );
};

export const multichainAssetToCoinGeckoId = (asset: DerivationPathDeserialized['asset']) => {
  const map = {
    ETH:  'ethereum',
    BNB:  'binance',
    BTC:  'bitcoin',
  };

  return map[asset] || null;
};

export const multichainAssetToNetworkName = (asset: DerivationPathDeserialized['asset']) => {
  const map = {
    ETH:  'Ethereum Network',
    BNB:  'Binance Smart Chain',
    BTC:  'Bitcoin Network',
  };

  return map[asset] || null;
};

export const getMultichainCoinGeckoPrice = async (asset: DerivationPathDeserialized['asset']) => fetchGeckoPrices(multichainAssetToCoinGeckoId(asset));

const convertTokenToReadable = (value : MultichainIframeMessage['value'], asset: DerivationPathDeserialized['asset']) => {
  if (asset === 'ETH') {
    return parseFloat(formatEther(value));
  }
  return null;
};

export const getTokenAndTotalPrice = async (asset: DerivationPathDeserialized['asset'], value: MultichainIframeMessage['value']) => {
  const id = multichainAssetToCoinGeckoId(asset);
  if (id) {
    const res = await getMultichainCoinGeckoPrice(asset);
    const tokenPrice: number = res[id].usd;
    const tokenAmount = convertTokenToReadable(value, asset);
    return {
      price: parseInt((tokenPrice * tokenAmount * 100).toString(), 10) / 100,
      tokenAmount,
      tokenPrice
    };
  }
  return {
    price:       0,
    tokenAmount: convertTokenToReadable(value, asset)
  };
};

export const shortenAddress = (address: string): string => {
  if (address.length < 10) {
    return address;
  }
  return `${address.substring(0, 7)}...${address.substring(address.length - 5)}`;
};

type GasFee = {
  message: MultichainIframeMessage,
  asset: DerivationPathDeserialized['asset'],
  usdCostOfToken: number
}

export const getGasFee = async ({
  message, asset, usdCostOfToken
}: GasFee) => {
  if (asset === 'ETH') {
    return getEthereumGasFee({
      chainId:      message.chainId,
      usdCostOfEth: usdCostOfToken,
    });
  }
  return null;
};
