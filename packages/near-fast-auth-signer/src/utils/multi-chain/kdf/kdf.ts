import BN from 'bn.js';
import { ec as EC } from 'elliptic';
import { ethers } from 'ethers';
import { base_decode } from 'near-api-js/lib/utils/serialize';

function najPublicKeyStrToUncompressedHexPoint(najPublicKeyStr) {
  return `04${Buffer.from(base_decode(najPublicKeyStr.split(':')[1])).toString('hex')}`;
}

async function sha256Hash(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);

  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  const hashArray = [...new Uint8Array(hashBuffer) as any];
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function sha256StringToScalarLittleEndian(hashString) {
  const littleEndianString = hashString.match(/../g).reverse().join('');

  const scalar = new BN(littleEndianString, 16);

  return scalar;
}

async function deriveChildPublicKey(
  parentUncompressedPublicKeyHex,
  signerId,
  path = ''
) {
  const ec = new EC('secp256k1');
  let scalar = await sha256Hash(
    `near-mpc-recovery v0.1.0 epsilon derivation:${signerId},${path}`
  );
  scalar = sha256StringToScalarLittleEndian(scalar) as any;

  const x = parentUncompressedPublicKeyHex.substring(2, 66);
  const y = parentUncompressedPublicKeyHex.substring(66);

  // Create a point object from X and Y coordinates
  const oldPublicKeyPoint = ec.curve.point(x, y);

  // Multiply the scalar by the generator point G
  const scalarTimesG = ec.g.mul(scalar);

  // Add the result to the old public key point
  const newPublicKeyPoint = oldPublicKeyPoint.add(scalarTimesG);

  return `04${
    newPublicKeyPoint.getX().toString('hex').padStart(64, '0')
    + newPublicKeyPoint.getY().toString('hex').padStart(64, '0')}`;
}

export const generateEthereumAddress = async (
  signerId: string,
  path: string,
  publicKey: string
) => {
  const uncompressedHexPoint = najPublicKeyStrToUncompressedHexPoint(publicKey);
  const childPublicKey = await deriveChildPublicKey(
    uncompressedHexPoint,
    signerId,
    path
  );
  const publicKeyNoPrefix = childPublicKey.startsWith('04')
    ? childPublicKey.substring(2)
    : childPublicKey;
  const hash = ethers.keccak256(Buffer.from(publicKeyNoPrefix, 'hex'));

  return `0x${hash.substring(hash.length - 40)}`;
};

export const generateBTCAddress = async (
  signerId: string,
  path: string,
  publicKey: string,

): Promise<string> => {
  const uncompressedHexPoint = najPublicKeyStrToUncompressedHexPoint(publicKey);
  return deriveChildPublicKey(
    uncompressedHexPoint,
    signerId,
    path
  );
};
