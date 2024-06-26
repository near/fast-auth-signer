import * as yup from 'yup';

import { BaseSendMultichainMessageSchema } from '../schema';

export const SendEVMMultichainMessageSchema = BaseSendMultichainMessageSchema.shape({
  transaction:    yup.mixed().required(),
  chainConfig: yup.object().shape({
    providerUrl: yup.string().required(),
    contract:    yup.string().required(),
  }).required(),
  derivationPath:     yup.object().shape({
    chain:  yup.number().oneOf([60]).required(),
    domain: yup.string().optional(),
    meta:   yup.object().optional()
  }).required()
});
