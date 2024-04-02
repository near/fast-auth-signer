# fast-auth-signer ![Docker Pulls](https://img.shields.io/docker/pulls/nearprotocol/fast-auth-sdk-frontend?link=https%3A%2F%2Fhub.docker.com%2Fr%2Fnearprotocol%2Ffast-auth-sdk-frontend)
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
#### Run your own instance
Instructions to run your own instance of the signer app can be found [here](https://docs.near.org/tools/fastauth-sdk#setting-up-the-frontend).
#### End-to-End tests
Run `yarn test` from the repository root.
