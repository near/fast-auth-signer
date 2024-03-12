interface FunctionCallRelayer {
  FunctionCall: {
    method_name: string;
    args: string;
    gas: number;
    deposit: string;
  };
}

type ActionsRelayer = FunctionCallRelayer;

interface DelegateActionRelayerFormat {
  actions: ActionsRelayer[];
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
