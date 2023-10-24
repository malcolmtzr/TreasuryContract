# PURSE Treasury Contract

## Description

<p>A treasury contract that helps to send PURSE to the PURSE staking contract. PURSE can be deposited into the treasury contract, and after a set interval (30 days by default), allows PURSE to be sent to the Staking contract.</p>
<p>Assuming, we aim to stake n amount of PURSE per year into the PURSE staking contract. This amount of PURSE can be deposited into the treasury contract, and then after every 30 days, allows a configured amount of PURSE to be sent to the staking contract. We can therefore send PURSE to the PURSE staking contract once every month through the treasury contract. </p>
<p>The purpose of doing so is to increase the APR. APR is calculated based on the equation: <br>
$$ APR = {sum~of~past~30~days~distribution~sum}{total~staked} * 12 * 100 $$
</p>
<p>By sending PURSE (note: not staking PURSE) to the staking contract, this will increase the sum of past 30 days distribution sum value through the PURSE BDL mechanism, thereby increasing the APR.</p>



# Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a script that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat run scripts/deploy.js
```
