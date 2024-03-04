import type { BigNumberish } from 'ethers';
import * as yup from 'yup';

export const ethereumSchema = yup.object().shape({
  nearAccountId:    yup.string().required('nearAccountId is required'),
  derivationPath:   yup.string().required('derivationPath is required'),
  to:               yup.string().required('to is required'),
  value:            yup.mixed<BigNumberish>().required('value is required'),
  chainId:          yup.mixed<BigNumberish>().required('chainId is required')
});
