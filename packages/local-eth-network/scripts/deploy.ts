import fs from 'fs';

import { ethers } from 'hardhat';

async function main() {
  let deployedContracts = {};

  const FTContractFactory = await ethers.getContractFactory('EIP20');

  const initialAmount = ethers.parseEther('1000000'); // 1 million tokens
  const tokenName = 'My Token';
  const decimalUnits = 18;
  const tokenSymbol = 'MTK';

  const FTContract = await FTContractFactory.deploy(
    initialAmount,
    tokenName,
    decimalUnits,
    tokenSymbol
  );
  const FT = await FTContract.getAddress();

  deployedContracts = {
    FT,
  };

  fs.writeFileSync('deployed-contracts.json', JSON.stringify(deployedContracts, null, 2));

  console.log('FT contract has been deployed and its contract address has been saved to deployed-contracts.json');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
