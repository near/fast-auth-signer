import * as yup from 'yup';

export const BaseSendMultichainMessageSchema = yup.object().shape({
  from:   yup.string().required('from is required'),
  domain: yup.string().optional(),
  meta:   yup.object().optional(),
  to:     yup.string().required('to is required'),
  value:  yup.mixed<bigint>().required('value is required'),
});
