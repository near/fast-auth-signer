require('@nomicfoundation/hardhat-toolbox');

const config = {
  solidity: '0.8.24',
  networks: {
    hardhat: {
      port:    8545,
      chainId: 11155111,
    }
  }
};

module.exports = config;
