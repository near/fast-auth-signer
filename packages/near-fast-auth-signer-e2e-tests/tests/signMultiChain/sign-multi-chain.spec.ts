import { KeyPair } from '@near-js/crypto';
import { expect, Page, test } from '@playwright/test';
import { JsonRpcProvider, ethers } from 'ethers';

import FTContractJSON from '../../artifacts/contracts/FT.sol/EIP20.json';
import {
  receivingAddresses, getFastAuthIframe,
  derivedAddresses
} from '../../utils/constants';
import { callContractWithDataField } from '../../utils/multiChain';
import { overridePasskeyFunctions } from '../../utils/passkeys';
import { isWalletSelectorLoaded } from '../../utils/walletSelector';
import SignMultiChain, { KeyType } from '../models/SignMultiChain';

let page: Page;
let signMultiChain: SignMultiChain;

const userFAK = process.env.MULTICHAIN_TEST_ACCOUNT_FAK;
const accountId = process.env.MULTICHAIN_TEST_ACCOUNT_ID;

const isAuthenticated = async (loggedIn: boolean) => {
  const fakKeyPair = KeyPair.fromString(userFAK);

  if (!page) return;
  if (loggedIn) {
    await overridePasskeyFunctions(page, {
      creationKeypair:  fakKeyPair,
      retrievalKeypair: fakKeyPair
    });
    return;
  }
  await overridePasskeyFunctions(page, {
    creationKeypair:  KeyPair.fromRandom('ed25519'),
    retrievalKeypair: KeyPair.fromRandom('ed25519')
  });
};

test.describe('Sign MultiChain', () => {
  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    signMultiChain = new SignMultiChain(page);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    /* webpack-dev-server adds a hidden iframe for hot reloading, which interferes with event propagation,
    causing Playwright tests to run longer (up to 40 minutes). To prevent this, the iframe needs to be disabled.
    This issue doesn't occur in production since webpack-dev-server is only used in development. */
    await signMultiChain.disablePointerEventsInterruption();
    await page.evaluate(
    // eslint-disable-next-line no-shadow
      async ([accountId]) => {
        window.localStorage.setItem('accountId', JSON.stringify(accountId));
      },
      [accountId]
    );
  });

  test.beforeEach(() => {
    test.slow();
  });

  test('Should show transaction details', async () => {
    await isWalletSelectorLoaded(page);
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
    await isAuthenticated(false);
    await signMultiChain.submitAndApproveTransaction({
      keyType: 'personalKey', assetType: 'eth', amount: 0.001, address: receivingAddresses.ETH_BNB
    });
    await signMultiChain.waitForMultiChainResponse();
    await expect(page.locator('#nfw-connect-iframe')).toBeVisible();
    await expect(getFastAuthIframe(page).getByText('You are not authenticated or there has been an indexer failure')).toBeVisible();
  });

  test('Should Pass: Send ETH with Personal Key', async () => {
    await isWalletSelectorLoaded(page);
    await isAuthenticated(true);
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

  // Skipping this because of the unpredictable nature concerning replacement fee
  test.skip('Should Pass: Send BNB with domain Key', async () => {
    await isWalletSelectorLoaded(page);
    await isAuthenticated(true);
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
    await isAuthenticated(true);
    await signMultiChain.submitTransaction({
      keyType: 'unknownKey', assetType: 'btc', amount: 0.01, address: receivingAddresses.BTC
    });
    const multiChainResponse = await signMultiChain.waitForMultiChainResponse();
    expect(multiChainResponse).toHaveProperty('message');
    expect(multiChainResponse.message).toContain('Invalid transaction');
    await expect(page.locator('#nfw-connect-iframe')).not.toBeVisible();
  });

  // NOTE: The following tests are skipped due to rate limiting on Infura's free plan (10 requests/second).
  // To run these tests, consider upgrading to a paid plan or run local EVM blockchains with Ganache.
  test.describe('EVM Function Call', () => {
    async function deployFTContract() {
      const provider = new JsonRpcProvider('http://localhost:8545');
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
      await isAuthenticated(true);
      await signMultiChain.submitTransaction({
        keyType,
        assetType:      'eth',
        amount:         0,
        address:        contractAddress,
        isFunctionCall: true
      });
      const iframe = getFastAuthIframe(page);
      await expect(iframe.getByText(expectedMessagePart)).toBeVisible({ timeout: 10000 });
    };

    test.describe('ERC20 functions', () => {
      const contractAddress = receivingAddresses.ETH_FT_SMART_CONTRACT;

      test('should mint tokens', async () => {
        await testFunctionMessage({
          contractAddress,
          functionName:        'mint(address,uint256)',
          args:                [derivedAddresses.EVM_PERSONAL, ethers.parseEther('1000000')],
          expectedMessagePart: "You are calling a method on a contract that we couldn't identify. Please make sure you trust the receiver address and application.",
          keyType:             'personalKey'
        });
        await signMultiChain.clickApproveButton();
        const multiChainResponse = await signMultiChain.waitForMultiChainResponse();
        expect(multiChainResponse.transactionHash).toBeDefined();
      });

      test.only('should transfer', async () => {
        const contractDeployed = await deployFTContract();
        console.log({ address: contractDeployed.address });

        await testFunctionMessage({
          contractAddress,
          functionName:        'transfer(address,uint256)',
          args:                [derivedAddresses.EVM_UNKNOWN, ethers.parseUnits('100', 18)],
          expectedMessagePart: `Transferring 100.0 FTT3 (Felipe Test Token 3) to ${derivedAddresses.EVM_UNKNOWN}.`,
          keyType:             'personalKey'
        });
      });

      test('should approve tokens', async () => {
        await testFunctionMessage({
          contractAddress,
          functionName:        'approve(address,uint256)',
          args:                [derivedAddresses.EVM_UNKNOWN, ethers.parseEther('100')],
          expectedMessagePart: `Approving ${derivedAddresses.EVM_UNKNOWN} to manage up to 100.0 FTT3 (Felipe Test Token 3). This allows them to transfer this amount on your behalf.`,
          keyType:             'personalKey'
        });
      });

      test('should transfer tokens from another account', async () => {
        await testFunctionMessage({
          contractAddress,
          functionName:        'transferFrom(address,address,uint256)',
          args:                [derivedAddresses.EVM_PERSONAL, derivedAddresses.EVM_UNKNOWN, ethers.parseEther('100')],
          expectedMessagePart: `Transferring 100.0 FTT3 (Felipe Test Token 3) from ${derivedAddresses.EVM_PERSONAL} to ${derivedAddresses.EVM_UNKNOWN}.`,
          keyType:             'unknownKey'
        });
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
