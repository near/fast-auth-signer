import * as yup from 'yup';

import { BaseSendMultichainMessageSchema } from '../schema';

export const SendEVMMultichainMessageSchema = BaseSendMultichainMessageSchema.shape({
  transaction: yup.object().shape({
    to:                   yup.string().required(),
    value:                yup.mixed().required(),
    from:                 yup.string().optional(),
    gasLimit:             yup.mixed().optional(),
    maxPriorityFeePerGas: yup.mixed().optional(),
    maxFeePerGas:         yup.mixed().optional(),
    data:                 yup.string().optional(),
    chainId:              yup.number().oneOf([
      1,
      11155111,
      56,
      97
    ]).required(),
  }).required(),
  chainConfig: yup.object().shape({
    providerUrl: yup.string().optional(),
    contract:    yup.string().optional(),
  }).optional(),
  derivationPath:     yup.object().shape({
    chain:  yup.number().oneOf([60]).required(),
    domain: yup.string().optional(),
    meta:   yup.object().optional()
  }).required()
});
