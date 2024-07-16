import fs from 'fs';

import { JsonRpcProvider, ethers } from 'ethers';

// Set up a provider manually
const provider = new JsonRpcProvider('http://localhost:8545');

// Read the ABI from the JSON file
const contractABI = JSON.parse(fs.readFileSync('./artifacts/contracts/FT.sol/EIP20.json', 'utf8')).abi;

export async function deployFTContract() {
  const signer = await provider.getSigner();
  const factory = new ethers.ContractFactory(
    contractABI,
    JSON.parse(fs.readFileSync('./artifacts/contracts/FT.sol/EIP20.json', 'utf8')).bytecode,
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

let contractAddress: string;

const main = async () => {
  // Deploy the contract
  const { address } = await deployFTContract();
  contractAddress = address;

  console.log(`Contract deployed at: ${contractAddress}`);
};

main().then(() => process.exit(0)).catch((error) => {
  console.error(error);
  process.exit(1);
});
