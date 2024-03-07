import crypto from 'crypto';

import BN from 'bn.js';
import bs58 from 'bs58';
import { ec as EC } from 'elliptic';

const EPSILON_DERIVATION_PREFIX =  'near-mpc-recovery v0.1.0 epsilon derivation:';

const secp256k1 = new EC('secp256k1');

export function deriveEpsilon(signerId: string, path: string): string {
  const derivationPath = `${EPSILON_DERIVATION_PREFIX}${signerId},${path}`;
  const hash = crypto.createHash('sha256').update(derivationPath).digest();
  const ret = new BN(hash, 'le').toString('hex');

  return ret;
}

export function deriveKey(publicKeyStr: string, epsilon: string): string {
  const base58PublicKey = publicKeyStr.split(':')[1];

  const decodedPublicKey = Buffer.from(bs58.decode(base58PublicKey)).toString(
    'hex'
  );

  const publicKey = secp256k1.keyFromPublic(`04${decodedPublicKey}`, 'hex');
  const derivedPoint = publicKey.getPublic().add(secp256k1.g.mul(epsilon));
  return derivedPoint.encode('hex', false);
}
