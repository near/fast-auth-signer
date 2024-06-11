export type LimitedAccessKey = {
  public_key: string,
  receiver_id: string,
  allowance: string,
  method_names: string
}

export type NewAccountResponse =
  | {
  type: 'ok',
  create_account_options: {
    full_access_keys: string[] | null,
    limited_access_keys: LimitedAccessKey[] | null,
    contract_bytes: string[] | null
  },
  user_recovery_public_key: string,
  near_account_id: string
}
  | {
  type: 'err',
  msg: string
};
