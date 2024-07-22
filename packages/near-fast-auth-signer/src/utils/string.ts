import { v4 as uuid } from 'uuid';

import { networkId } from './config';

export function getSocialLoginAccountId() {
  const randomString = uuid();
  return `sli-${randomString}.${networkId === 'testnet' ? 'testnet' : 'near'}`;
}
