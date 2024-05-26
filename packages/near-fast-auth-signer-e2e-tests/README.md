# fast-auth-signer-e2e-tests

This package is dedicated to end-to-end testing on Near Fastauth.

## Installation and Usage

To use this package, ensure the `fast-auth-signer` project is correctly set up. Then, install all dependencies using:
```bash
yarn install
```

Next, set up the environment variables. The contents of these variables are shared only with selected maintainers. To configure your local test environment, create a `.env` file in the root directory and add the following variables:

```bash
MAILTRAP_USER=
MAILTRAP_PASS=
MAILTRAP_EMAIL=

FIREBASE_SERVICE_ACCOUNT_TESTNET=
```

Once everything is set up, you can run the following commands:
```bash
# run all test
yarn run test

# debug during the test
npx playwright test --ui
```


## License

This repository is distributed under the terms of both the MIT license and the Apache License (Version 2.0).
