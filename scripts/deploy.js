// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

/*
IMPORTANT:
For testing on testnet use the following:
    //testnet
    //PURSE: 0xd66c6B4F0be8CE5b39D52E0Fd1344c389929B378 (actually ETH)
    //PURSE_STAKING = 0xAbCCf019ce52e7DEac396D1f1A1D9087EBF97966 (actually account2)
    
BEFORE DEPLOYING TO MAINNET, CHANGE THE FOLLOWING
    //mainnet
    //PURSE: 0x29a63F4B209C29B4DC47f06FFA896F32667DAD2C
    //PURSE_STAKING = 0xFb1D31a3f51Fb9422c187492D8EA14921d6ea6aE
*/

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  const Treasury = await hre.ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy();
  await treasury.waitForDeployment();
  console.log(`Contract deployed at ${treasury.target}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});