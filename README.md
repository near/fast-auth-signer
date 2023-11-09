# fast-auth-signer
Monorepo for fast-auth-signer functionality - contains frontend app, and associated E2E test suites defined using Playwright

## Packages
#### [near-fast-auth-signer](./packages/near-fast-auth-signer/README.md)
Web application designed primarily for usage via embedding into parent site using an iframe 
#### [near-fast-auth-signer-e2e-tests](./packages/near-fast-auth-signer-e2e-tests/README.md)
E2E test suites for `near-fast-auth-signer` using Playwright tests.

## Usage
This repository leverages Yarn workspaces.  

#### Local Development
Run `yarn` from the repository root. This will install dependencies for all packages by way of Yarn workspaces functionality.
#### End-to-End tests
Run `yarn test` from the repository root.
