require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const MNEMONIC = process.env.MNEMONIC;

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
      url: "https://data-seed-prebsc-1-s1.bnbchain.org:8545",
      chainId: 97,
      gasPrice: 20000000000,
      accounts: {
        mnemonic: MNEMONIC
      }
    },
    bscmainnet: {
      url: "https://bsc-dataseed.bnbchain.org/",
      chainId: 56,
      gasPrice: 20000000000,
      accounts: {
        mnemonic: MNEMONIC
      }
    }
  }
};
