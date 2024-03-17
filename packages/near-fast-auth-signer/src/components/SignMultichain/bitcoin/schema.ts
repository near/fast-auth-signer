import * as yup from 'yup';

export const bitcoinSchema = yup.object().shape({
  derivationPath:       yup.string().required('derivationPath is required'),
  to:                   yup.string().required('to is required'),
  value:                yup.mixed<bigint>().required('value is required'),
  fee:                  yup.number().optional(),
  utxos:                yup.array().optional(),
}).test('fee and utxos check', 'If fee is present, utxos must be present and vice versa', (value) => {
  const { fee, utxos } = value;
  // Check if both are present or both are undefined
  if ((fee && utxos) || (!fee && !utxos)) {
    return true; // Validation succeeds
  }
  return false; // Validation fails
});
