import { SignedDelegate } from '@near-js/transactions';
import bs58 from 'bs58';

import { SignedDelegateRelayerFormat } from './types';

/**
 * Parses the signedDelegate object from the Multi-Party Computation (MPC) format to the Relayer format.
 * @param signedDelegate - The signedDelegate object in MPC format.
 * @returns The signedDelegate object in Relayer format.
 */
export function parseSignedDelegateForRelayer(
  signedDelegate: SignedDelegate
): SignedDelegateRelayerFormat {
  return {
    delegate_action: {
      actions: signedDelegate.delegateAction.actions
        .map((action) => {
          if (action.functionCall) {
            return {
              FunctionCall: {
                method_name: action.functionCall.methodName,
                args:        Buffer.from(action.functionCall.args).toString('base64'),
                gas:         action.functionCall.gas.toNumber(),
                deposit:     action.functionCall.deposit.toString(),
              },
            };
          }
          return undefined;
        })
        .filter((t) => t),
      nonce:            signedDelegate.delegateAction.nonce.toNumber(),
      max_block_height: signedDelegate.delegateAction.maxBlockHeight.toNumber(),
      public_key:       signedDelegate.delegateAction.publicKey.toString(),
      receiver_id:      signedDelegate.delegateAction.receiverId,
      sender_id:        signedDelegate.delegateAction.senderId,
    },
    signature: `ed25519:${bs58.encode(signedDelegate.signature.data)}`,
  };
}
