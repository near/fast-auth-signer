import * as yup from 'yup';

export const BaseSendMultichainMessageSchema = yup.object().shape({
  fastAuthRelayerUrl: yup.string().optional(),
});
