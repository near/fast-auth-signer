export interface FunctionCall {
  FunctionCall: {
    method_name: string;
    args: string;
    gas: number;
    deposit: string;
  };
}

export type Actions = FunctionCall;

export interface DelegateActionRelayerFormat {
  actions: Actions[];
  nonce: number;
  max_block_height: number;
  public_key: string;
  receiver_id: string;
  sender_id: string;
}

export interface SignedDelegateRelayerFormat {
  delegate_action: DelegateActionRelayerFormat;
  signature: string;
}
