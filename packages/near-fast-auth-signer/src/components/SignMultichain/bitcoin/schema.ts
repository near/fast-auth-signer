import * as yup from 'yup';

import { BaseSendMultichainMessageSchema } from '../schema';

export const SendBTCMultichainMessageSchema = BaseSendMultichainMessageSchema.shape({
  chain:   yup.number().required().test('is-btc', 'Invalid BTC chain value', (value) => value === 0),
  network: yup.string().oneOf(['mainnet', 'testnet']).required(),
  fee:     yup.number().optional(),
  utxos:   yup.array().optional(),
}).test('fee and utxos check', 'If fee is present, utxos must be present and vice versa', (value) => {
  const { fee, utxos } = value;
  // Check if both are present or both are undefined
  if ((fee && utxos) || (!fee && !utxos)) {
    return true; // Validation succeeds
  }
  return false; // Validation fails
});
