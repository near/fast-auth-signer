import { KeyPair } from '@near-js/crypto';
import { expect, Page, test } from '@playwright/test';
import { JsonRpcProvider, ethers } from 'ethers';
import { fetchDerivedEVMAddress, SLIP044ChainId } from 'multichain-tools';

import FTContractJSON from '../../artifacts/contracts/FT.sol/EIP20.json';
import {
  receivingAddresses, getFastAuthIframe,
} from '../../utils/constants';
import { getRandomEmailAndAccountId } from '../../utils/email';
import { createAccount, initializeAdmin } from '../../utils/firebase';
import { callContractWithDataField } from '../../utils/multiChain';
import { overridePasskeyFunctions } from '../../utils/passkeys';
import { isWalletSelectorLoaded } from '../../utils/walletSelector';
import SignMultiChain, { KeyType } from '../models/SignMultiChain';
import { TestDapp } from '../models/TestDapp';

let page: Page;
let signMultiChain: SignMultiChain;

test.beforeAll(async () => {
  initializeAdmin();
});

const isAuthenticated = async ({
  isLoggedIn,
  isNewAccount
}:
  {
    isLoggedIn: boolean,
    isNewAccount: boolean
  }): Promise<{ accountId: string, keypair: KeyPair }> => {
  if (page) {
    if (isLoggedIn && isNewAccount) {
      const { email, accountId } = getRandomEmailAndAccountId();
      const fullAccountId = `${accountId}.testnet`;
      const keypair = KeyPair.fromRandom('ED25519');
      await createAccount({
        email,
        accountId,
        oidcKeyPair: KeyPair.fromRandom('ED25519'),
        FAKs:        [keypair],
        LAKs:        []
      });
      await overridePasskeyFunctions(page, { creationKeypair: keypair, retrievalKeypair: keypair });

      return { accountId: fullAccountId, keypair };
    } if (isLoggedIn) {
      // const userFAK = process.env.MULTICHAIN_TEST_ACCOUNT_FAK;
      // const accountId = process.env.MULTICHAIN_TEST_ACCOUNT_ID;
      const userFAK = 'ed25519:wxW3ZxKJhmrXEB5ru4cQEjvP69cMCms3UQ5CxQ6NZE1EXv2bgey6r8kb9SMs2cjvhZuARyMRHxLcq4nqxCmLG8y';
      const accountId = 'johndoe12.testnet';

      const fakKeyPair = KeyPair.fromString(userFAK);

      await page.evaluate(
        // eslint-disable-next-line no-shadow
        async ([accountId]) => {
          window.localStorage.setItem('accountId', JSON.stringify(accountId));
        },
        [accountId]
      );
      await overridePasskeyFunctions(page, { creationKeypair: fakKeyPair, retrievalKeypair: fakKeyPair });

      return { accountId, keypair: fakKeyPair };
    }
    await overridePasskeyFunctions(page, {
      creationKeypair:  KeyPair.fromRandom('ed25519'),
      retrievalKeypair: KeyPair.fromRandom('ed25519')
    });

    return { accountId: '', keypair: KeyPair.fromRandom('ed25519') };
  }

  throw new Error('No page found');
};

test.describe('Sign MultiChain', () => {
  const provider = new JsonRpcProvider('http://localhost:8545');

  test.beforeEach(async ({ browser }) => {
    test.slow();

    const context = await browser.newContext();
    page = await context.newPage();
    signMultiChain = new SignMultiChain(page);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    /* webpack-dev-server adds a hidden iframe for hot reloading, which interferes with event propagation,
    causing Playwright tests to run longer (up to 40 minutes). To prevent this, the iframe needs to be disabled.
    This issue doesn't occur in production since webpack-dev-server is only used in development. */
    await signMultiChain.disablePointerEventsInterruption();
  });

  // We are limited in the number of tests we can run concurrently due to using a single accountId.
  // Increasing the test count could lead to nonce issues, as each transaction requires a unique nonce.
  test.describe('Native token transactions on testnet RPC', async () => {
    test('Should show transaction details', async () => {
      await isWalletSelectorLoaded(page);
      await isAuthenticated({ isLoggedIn: true, isNewAccount: false });
      await signMultiChain.submitTransaction({
        keyType: 'unknownKey', assetType: 'bnb', amount: 0.01, address: receivingAddresses.ETH_BNB
      });
      const frame = getFastAuthIframe(page);
      await frame.locator('text=Send 0.01 BNB').waitFor({ state: 'visible' });
      await frame.locator('button:has-text("Approve")').waitFor({ state: 'visible' });
      await expect(frame.getByText('We don’t recognize this app, proceed with caution')).toBeVisible();
      await expect(frame.locator('button:has-text("Approve")')).toBeDisabled();
      await frame.locator('input[type="checkbox"]').check();
      await expect(frame.locator('button:has-text("Approve")')).toBeEnabled();
    });

    test('Should Fail: if not authenticated', async () => {
      await isWalletSelectorLoaded(page);
      await isAuthenticated({ isLoggedIn: false, isNewAccount: false });
      await signMultiChain.submitTransaction({
        keyType: 'personalKey', assetType: 'eth', amount: 0.001, address: receivingAddresses.ETH_BNB
      });
      await expect(getFastAuthIframe(page).getByText('You are not authenticated or there has been an indexer failure')).toBeVisible({ timeout: 10000 });
    });

    // Can fail on relayer or contract signature
    test('Should Pass: Send ETH with Personal Key', async () => {
      await isWalletSelectorLoaded(page);
      await isAuthenticated({ isLoggedIn: true, isNewAccount: false });
      await signMultiChain.submitTransaction({
        keyType: 'personalKey', assetType: 'eth', amount: 0.001, address: receivingAddresses.ETH_BNB
      });
      const frame = getFastAuthIframe(page);
      await frame.locator('text=Send 0.001 ETH').waitFor({ state: 'visible' });
      await signMultiChain.clickApproveButton();
      const multiChainResponse = await signMultiChain.waitForMultiChainResponse();
      expect(multiChainResponse.transactionHash).toBeDefined();
      expect(multiChainResponse).toHaveProperty('message');
      expect(multiChainResponse.message).toBe('Successfully signed and sent transaction');
      await expect(page.locator('#nfw-connect-iframe')).not.toBeVisible();
    });

    // Can fail on relayer or contract signature
    test.skip('Should Pass: Send BNB with domain Key', async () => {
      await isWalletSelectorLoaded(page);
      await isAuthenticated({ isLoggedIn: true, isNewAccount: false });
      await signMultiChain.submitTransaction({
        keyType: 'domainKey', assetType: 'bnb', amount: 0.0001, address: receivingAddresses.ETH_BNB
      });
      const multiChainResponse = await signMultiChain.waitForMultiChainResponse();
      expect(multiChainResponse.transactionHash).toBeDefined();
      expect(multiChainResponse).toHaveProperty('message');
      expect(multiChainResponse.message).toBe('Successfully signed and sent transaction');
      await expect(page.locator('#nfw-connect-iframe')).not.toBeVisible();
    });

    test('Should Fail: Insufficient Funds with Unknown Key + BTC', async () => {
      await isWalletSelectorLoaded(page);
      await isAuthenticated({ isLoggedIn: true, isNewAccount: false });
      await signMultiChain.submitTransaction({
        keyType: 'unknownKey', assetType: 'btc', amount: 0.01, address: receivingAddresses.BTC
      });
      const iframe = getFastAuthIframe(page);
      await expect(iframe.getByText('Invalid transaction: coinselect failed to find a suitable set of inputs and outputs. This could be due to insufficient funds, or no inputs being available that meet the criteria.')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Local RPC', async () => {
    async function topUpAccount(address: string, amount: string) {
      const funderSigner = await provider.getSigner();
      const tx = await funderSigner.sendTransaction({
        to:    address,
        value: ethers.parseEther(amount)
      });

      await tx.wait();

      return address;
    }

    const fetchAddressAndTopUp = async ({
      accountId,
      keyType,
      shouldTopUp = true
    }:
      {
        accountId: string;
        keyType: KeyType;
        shouldTopUp?: boolean
      }): Promise<string> => {
      const path: { chain: SLIP044ChainId; domain?: string } = { chain: 60 };

      if (keyType === 'unknownKey') {
        path.domain = 'https://app.unknowndomain.com';
      } else if (keyType === 'domainKey') {
        path.domain = 'http://127.0.0.1:3001/';
      }

      const key = await fetchDerivedEVMAddress({
        signerId:             accountId,
        path,
        nearNetworkId:        'testnet',
        multichainContractId: 'v2.multichain-mpc.testnet'
      });

      if (shouldTopUp) {
        await topUpAccount(key, '100');
      }
      return key;
    };

    test.describe('EVM Function Call', () => {
      async function deployFTContract() {
        const contractABI = FTContractJSON.abi;

        const signer = await provider.getSigner();
        const factory = new ethers.ContractFactory(
          contractABI,
          FTContractJSON.bytecode,
          signer
        );

        const FTContract = await factory.deploy(
          ethers.parseUnits('1000000', 18),
          'FungibleToken',
          18,
          'FT'
        );

        await FTContract.waitForDeployment();

        const deployedAddress = await FTContract.getAddress();

        return { contract: FTContract, address: deployedAddress };
      }

      const setupFunctionCall = async (functionName: string, args: any[]) => {
        const evmFunctionCallData = callContractWithDataField(functionName, args);
        await page.evaluate(
          ([data]) => {
            window.localStorage.setItem('evmFunctionCallData', data);
          },
          [evmFunctionCallData]
        );
      };

      const testFunctionMessage = async ({
        contractAddress,
        functionName,
        args,
        expectedMessagePart,
        keyType
      }: {
        contractAddress: string,
        functionName: string,
        args: any[],
        expectedMessagePart: string,
        keyType: KeyType
      }) => {
        await setupFunctionCall(functionName, args);
        await isWalletSelectorLoaded(page);
        await signMultiChain.submitTransaction({
          keyType,
          assetType:      'eth',
          amount:         0,
          address:        contractAddress,
          isFunctionCall: true,
          useLocalRpc:    true
        });
        const iframe = getFastAuthIframe(page);
        await expect(iframe.getByText(expectedMessagePart)).toBeVisible({ timeout: 10000 });
        await signMultiChain.clickApproveButton();
        const multiChainResponse = await signMultiChain.waitForMultiChainResponse();
        expect(multiChainResponse.transactionHash).toBeDefined();
      };

      test('ERC20 functions', async () => {
        test.setTimeout(180000);

        const contractDeployed = await deployFTContract();
        const { accountId, keypair } = await isAuthenticated({ isLoggedIn: true, isNewAccount: true });
        await new TestDapp(page).loginWithKeyPairLocalStorage(accountId, KeyPair.fromRandom('ed25519'), keypair);

        const personalKey = await fetchAddressAndTopUp({ accountId, keyType: 'personalKey' });
        const unknownKey = await fetchAddressAndTopUp({ accountId, keyType: 'unknownKey' });

        await testFunctionMessage({
          contractAddress:     contractDeployed.address,
          functionName:        'mint(address,uint256)',
          args:                [personalKey, ethers.parseEther('1000000')],
          expectedMessagePart: "You are calling a method on a contract that we couldn't identify. Please make sure you trust the receiver address and application.",
          keyType:             'personalKey'
        });

        await testFunctionMessage({
          contractAddress:     contractDeployed.address,
          functionName:        'transfer(address,uint256)',
          args:                [unknownKey, ethers.parseUnits('100', 18)],
          expectedMessagePart: `Transferring 100.0 FT (FungibleToken) to ${unknownKey}.`,
          keyType:             'personalKey'
        });

        await testFunctionMessage({
          contractAddress:     contractDeployed.address,
          functionName:        'approve(address,uint256)',
          args:                [unknownKey, ethers.parseEther('100')],
          expectedMessagePart: `Approving ${unknownKey} to manage up to 100.0 FT (FungibleToken). This allows them to transfer this amount on your behalf.`,
          keyType:             'personalKey'
        });

        await testFunctionMessage({
          contractAddress:     contractDeployed.address,
          functionName:        'transferFrom(address,address,uint256)',
          args:                [personalKey, unknownKey, ethers.parseEther('100')],
          expectedMessagePart: `Transferring 100.0 FT (FungibleToken) from ${personalKey} to ${unknownKey}.`,
          keyType:             'unknownKey'
        });
      });

      // test('ERC721 functions', async () => {
      //   const contractAddress = receivingAddresses.ETH_NFT_ERC721_SMART_CONTRACT;

      //   await testFunctionMessage({
      //     contractAddress,
      //     functionName:        'safeTransferFrom(address,address,uint256)',
      //     args:                ['0x1234567890123456789012345678901234567890', '0x0987654321098765432109876543210987654321', 1],
      //     expectedMessagePart: 'Transferring Unknown token ID 1 from 0x1234567890123456789012345678901234567890 to 0x0987654321098765432109876543210987654321.',
      //     keyType:             'personalKey'
      //   });

      //   await testFunctionMessage({
      //     contractAddress,
      //     functionName:        'transferFrom(address,address,uint256)',
      //     args:                ['0x1234567890123456789012345678901234567890', '0x0987654321098765432109876543210987654321', 1],
      //     expectedMessagePart: 'Transferring Unknown token ID 1 from 0x1234567890123456789012345678901234567890 to 0x0987654321098765432109876543210987654321.',
      //     keyType:             'personalKey'
      //   });

      //   await testFunctionMessage({
      //     contractAddress,
      //     functionName:        'approve(address,uint256)',
      //     args:                ['0x1234567890123456789012345678901234567890', 1],
      //     expectedMessagePart: 'Approving 0x1234567890123456789012345678901234567890 to manage Unknown token ID 1. This allows them to transfer this specific token on your behalf.',
      //     keyType:             'personalKey'
      //   });

      //   await testFunctionMessage({
      //     contractAddress,
      //     functionName:        'setApprovalForAll(address,bool)',
      //     args:                ['0x1234567890123456789012345678901234567890', true],
      //     expectedMessagePart: 'Granting permission for 0x1234567890123456789012345678901234567890 to manage ALL your Unknown (ERC721) tokens. This is a powerful permission, use with caution.',
      //     keyType:             'personalKey'
      //   });
      // });

      // test('ERC1155 functions', async () => {
      //   const contractAddress = receivingAddresses.ETH_NFT_ERC1155_SMART_CONTRACT;

      //   await testFunctionMessage({
      //     contractAddress,
      //     functionName:        'safeTransferFrom(address,address,uint256,uint256,bytes)',
      //     args:                ['0x1234567890123456789012345678901234567890', '0x0987654321098765432109876543210987654321', 1, 1, '0x'],
      //     expectedMessagePart: 'Transferring 1 of Unknown token ID 1 from 0x1234567890123456789012345678901234567890 to 0x0987654321098765432109876543210987654321.',
      //     keyType:             'personalKey'
      //   });

      //   await testFunctionMessage({
      //     contractAddress,
      //     functionName:        'safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)',
      //     args:                ['0x1234567890123456789012345678901234567890', '0x0987654321098765432109876543210987654321', [1, 2], [1, 1], '0x'],
      //     expectedMessagePart: 'Batch transferring 2 Unknown (ERC1155) tokens (IDs: 1, 2) from 0x1234567890123456789012345678901234567890 to 0x0987654321098765432109876543210987654321 with quantities: 1, 1.',
      //     keyType:             'personalKey'
      //   });

      //   await testFunctionMessage({
      //     contractAddress,
      //     functionName:        'setApprovalForAll(address,bool)',
      //     args:                ['0x1234567890123456789012345678901234567890', true],
      //     expectedMessagePart: 'Granting permission for 0x1234567890123456789012345678901234567890 to manage ALL your Unknown (ERC1155) tokens. This is a powerful permission, use with caution.',
      //     keyType:             'personalKey'
      //   });
      // });

      // test('Should display default message for unknown contract interaction', async () => {
      //   await testFunctionMessage({
      //     contractAddress:     '0x1234567890123456789012345678901234567890',
      //     functionName:        'unknownFunction()',
      //     args:                [],
      //     expectedMessagePart: 'You are calling a method on a contract that we couldn\'t identify. Please make sure you trust the receiver address and application.',
      //     keyType:             'personalKey'
      //   });
      // });
    });
  });
});
