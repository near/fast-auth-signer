# Fast-Auth-Signer

This application facilitates generation of ED25519 keys using WebAuthN APIs (typically using biometrics), signing of transactions using those keys, and an implementation of 'sign in' functionality using the same paradigm as wallet apps in the ecosystem support.
It is designed to be integrated into [near-discovery](https://github.com/near/near-discovery) by way of inter-iframe RPC calls leveraging [iframe-rpc](https://github.com/near/near-api-js/tree/master/packages/iframe-rpc).

## How to run

This repository uses Yarn for package management. You'll need to install the dependencies first before you start the dev server.

```bash
yarn install
yarn start
```

## UI Routes
#### `/create-account`
- Displays a UI to create a new account
- Account creation is handled via the recovery service, using an e-mail link to get a valid OAuth assertion for that service
- FAK is generated via WebAuthN prompt (typically biometrics)
#### `/add-device`
- Displays a UI to authorize the current machine to control a recovery-service enabled account (adds a new biometric-based FAK to the account)
- FAK is generated via WebAuthN prompt (typically biometrics)
#### `/sign`
- Displays a UI to display transaction details, allowing the user to review the transaction and approve signing it.
#### `/login`
- Displays a UI to display a detailed overview of access key permissions that are being requested to be added to the user's account.



## RPC API
#### `createAccount(limitedAccessPublicKeys[]) -> { accountId: string, fullAccessPublicKey:string }`
- Returns the account ID of the account that the user created, along with the publicKey of the FAK that was used to secure the account (generated via WebAuthN prompt)
#### `getPublicKey() -> <PublicKey in Hex format`
- Returns the user's public key in hex format, which is derived from a WebAuthN (typically biometric) interaction
- Throws error if user has not yet authenticated
#### `getAccount() -> accountId: string`
- Returns the account ID of the account that the user is currently authenticated to use.  
- Throws error if user has not yet authenticated
#### `signTransactions(transactions[]) -> signedTransactions[]`
- Navigates to the appropate UI route (/sign)
- Returns signed transactions that can be submitted by the requester if approved
- Throws error if failed or cancelled by user
#### `signDelegateAction(actions) -> signedDelegateAction`
- Navigates to the appropate UI route (/sign)
- Returns a signed DelegateAction composed of the requested actions so that the requester can submit them for execution by a relayer if approved
- Throws error if failed or cancelled by user
#### `login(accessKey) -> boolean`
- Navigates to the appropate UI route (/login)
- Returns true if login was successful
- Throws error if failed or cancelled by user
