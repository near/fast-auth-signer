import { BorshSchema } from 'borsher';

export const derivationPathSchema = BorshSchema.Struct({
  asset:         BorshSchema.String,
  domain:        BorshSchema.Option(BorshSchema.String)
});
