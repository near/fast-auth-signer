import * as yup from 'yup';

export const evmSchema = yup.object().shape({
  derivationPath:       yup.string().required('derivationPath is required'),
  to:                   yup.string().required('to is required'),
  value:                yup.mixed<bigint>().required('value is required'),
  chainId:              yup.mixed<bigint>().required('chainId is required'),
  maxFeePerGas:         yup.mixed<bigint>().optional(),
  maxPriorityFeePerGas:     yup.mixed<bigint>().optional(),
  gasLimit:             yup.mixed<bigint>().optional(),
});
