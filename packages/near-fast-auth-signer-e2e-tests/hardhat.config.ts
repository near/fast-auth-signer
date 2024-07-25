require('@nomicfoundation/hardhat-toolbox');

const config = {
  solidity: '0.8.24',
  networks: {
    hardhat: {
      port: 8545
    }
  }
};

module.exports = config;
