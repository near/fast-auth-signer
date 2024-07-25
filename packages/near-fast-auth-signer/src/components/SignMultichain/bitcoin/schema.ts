import * as yup from 'yup';

import { BaseSendMultichainMessageSchema } from '../schema';

export const SendBTCMultichainMessageSchema = BaseSendMultichainMessageSchema.shape({
  transaction: yup.object().shape({
    to:      yup.string().required(),
    value:   yup.string().required(),
    inputs:  yup.array().optional(),
    outputs: yup.array(yup.object({
      address: yup.string().required(),
      value:   yup.number().required()
    })).optional()
  }).required(),
  chainConfig: yup.object().shape({
    providerUrl: yup.string().optional(),
    contract:    yup.string().optional(),
    network:     yup.string().oneOf(['mainnet', 'testnet', 'regtest']).required()
  }).required(),
  derivationPath:     yup.object().shape({
    chain:  yup.number().oneOf([0]).required(),
    domain: yup.string().optional(),
    meta:   yup.object().optional()
  }).required()
}).test('inputs and outputs check', 'If inputs are present, outputs must be present and vice versa', (value) => {
  const { transaction } = value;
  if (transaction) {
    const { inputs, outputs } = transaction;
    if ((inputs && outputs) || (!inputs && !outputs)) {
      return true;
    }
  }
  return false;
});
