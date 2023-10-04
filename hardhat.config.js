require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const MNEMONIC = process.env.MNEMONIC;
const PK = process.env.PK;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    bsctestnet: {
      url: "https://bsc-testnet.publicnode.com",
      chainId: 97,
      gas: 12400000,
      gasPrice: 20000000000,
      accounts: [PK],
      networkCheckTimeout: 999999,
      timeoutBlocks: 200,
    },
    bscmainnet: {
      url: "https://bsc-dataseed.bnbchain.org/",
      chainId: 56,
      gasPrice: 10000000000,
      accounts: [PK]
    },
    fxTestnet: {
      url: `https://testnet-fx-json-web3.functionx.io:8545`,
      accounts: [PK],
      networkCheckTimeout: 999999,
      timeoutBlocks: 200,
      gas: 12400000,
      gasPrice: 600000000000,
    },
  },
  etherscan: {
    apiKey: process.env.BSCSCANAPI
  }
};
