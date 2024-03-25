import * as yup from 'yup';

import { BaseSendMultichainMessageSchema } from '../schema';

export const SendEVMMultichainMessageSchema =  BaseSendMultichainMessageSchema.shape({
  chain: yup
    .number()
    .required()
    .test('is-evm', 'Invalid EVM chain value', (value) => value === 60),
  chainId: yup.lazy((value) => yup.mixed<bigint>().test(
    'is-valid-chainId',
    `Invalid chainId value: ${value}`,
    (val) => [BigInt(1), BigInt(56), BigInt(97), BigInt(11155111)].includes(val)
  )),
  maxFeePerGas:         yup.mixed<bigint>().optional(),
  maxPriorityFeePerGas: yup.mixed<bigint>().optional(),
  gasLimit:             yup.mixed<bigint>().optional(),
});
