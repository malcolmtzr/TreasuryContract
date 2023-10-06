const { assert, expect } = require("chai");
require("dotenv").config();
const hre = require("hardhat");
const BEP20ABI = require("./BEP20.json");

//npx hardhat test --network bsctestnet
describe("Treasury Tests", function () {
    let treasury;
    const treasuryTestnetAddress = "0x4b377Ab63DB0d3572be8aB009BC1D98a8AA77799";
    let signer;
    let otherAccount;

    beforeEach(async () => {
        const [_signer, _otherAccount] = await hre.ethers.getSigners();
        signer = _signer;
        otherAccount = await hre.ethers.getSigner("0xAbCCf019ce52e7DEac396D1f1A1D9087EBF97966")
        treasury = await hre.ethers.getContractAt(
            "Treasury",
            treasuryTestnetAddress,
            _signer
        );
    })

    describe("Non-owner test cases", function () {
        let _treasury;
        beforeEach(async () => {
            _treasury = await hre.ethers.getContractAt(
                "Treasury",
                treasuryTestnetAddress,
                otherAccount
            );
        })

        it("Non owner should not be able to call updateStakingAddress", async () => {
            await expect(
                _treasury.updateStakingAddress(
                    "0xFb1D31a3f51Fb9422c187492D8EA14921d6ea6aE"
                )
            ).to.be.revertedWith("Ownable: caller is not the owner");

        })

        it("Non owner should not be able to call updateDisburseInterval", async () => {
            await expect(
                _treasury.updateDisburseInterval(
                    1
                )
            ).to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("Non owner should not be able to call depositPurseToTreasury", async () => {
            await expect(
                _treasury.depositPurseToTreasury(
                    ethers.parseEther("0.01")
                )
            ).to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("Non owner should not be able to call disburseToPurseStaking", async () => {
            await expect(
                _treasury.disburseToPurseStaking(
                    ethers.parseEther("0")
                )
            ).to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("Non owner should not be able to call returnToken", async () => {
            await expect(
                _treasury.returnToken(
                    _treasury.PURSE(),
                    otherAccount,
                    ethers.parseEther("0.1")
                )
            ).to.be.revertedWith("Ownable: caller is not the owner");
        })
    })

    describe("Owner test cases", function () {
        it("check allowance", async () => {
            const token = await hre.ethers.getContractAt(
                BEP20ABI,
                await treasury.PURSE(),
                signer
            );
            const res = await token.allowance(signer.address, treasuryTestnetAddress);
            console.log(res)
        })

        it("Should be the correct owner", async () => {
            const owner = await treasury.owner();
            expect(owner).to.equal(signer.address)
        })

        it("Should update the staking address", async () => {
            const stakingAddr1 = "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd";
            const stakingAddr2 = "0xAbCCf019ce52e7DEac396D1f1A1D9087EBF97966"; //acct2

            const beforeStakingAddress = await treasury.PURSE_STAKING();
            const tx = await treasury.updateStakingAddress(stakingAddr2);
            await tx.wait();
            const afterStakingAddress = await treasury.PURSE_STAKING();
            expect(afterStakingAddress).not.equal(beforeStakingAddress);
            expect(afterStakingAddress).to.equal(stakingAddr2);
        })

        it("Should deposit to treasury", async () => {
            const token = await hre.ethers.getContractAt(
                BEP20ABI,
                await treasury.PURSE(),
                signer
            );

            const treasuryBalanceBefore = await token.balanceOf(treasuryTestnetAddress);
            const lastDepositedAmountBefore = await treasury.lastDepositedAmount();
            const depositHistoricTotalBefore = await treasury.depositHistoricTotal();
            const lastDepositTimeStampBefore = await treasury.lastDepositTimeStamp();

            const depositAmount = ethers.parseEther("1.2")
            const tx = await treasury.depositPurseToTreasury(
                depositAmount
            );
            await tx.wait();

            const treasuryBalanceAfter = await token.balanceOf(treasuryTestnetAddress);
            const lastDepositedAmountAfter = await treasury.lastDepositedAmount();
            const depositHistoricTotalAfter = await treasury.depositHistoricTotal();
            const lastDepositTimeStampAfter = await treasury.lastDepositTimeStamp();

            expect(treasuryBalanceAfter).not.equal(treasuryBalanceBefore);
            expect(lastDepositedAmountAfter).not.equal(lastDepositedAmountBefore);
            expect(lastDepositedAmountAfter).to.equal(depositAmount);
            expect(depositHistoricTotalAfter).to.equal(depositHistoricTotalBefore + depositAmount);
            expect(lastDepositTimeStampAfter).not.equal(lastDepositTimeStampBefore);
        })

        it("Should be able to disburse once after deploying", async () => {
            //note that treasury only disburses 1/12th of the deposited amount
            const token = await hre.ethers.getContractAt(
                BEP20ABI,
                await treasury.PURSE(),
                signer
            );
            const stakingAddress = await treasury.PURSE_STAKING();

            const stakingBalanceBefore = await token.balanceOf(stakingAddress);
            const lastDisbursedAmountBefore = await treasury.lastDisbursedAmount();
            const disburseHistoricTotalBefore = await treasury.disburseHistoricTotal();
            const lastDisbursementTimestampBefore = await treasury.lastDisbursementTimestamp();

            const currentDefaultDisburseAmount = await treasury.currentDefaultDisburseAmount()
            const tx = await treasury.disburseToPurseStaking(currentDefaultDisburseAmount);
            await tx.wait();

            const stakingBalanceAfter = await token.balanceOf(stakingAddress);
            const lastDisbursedAmountAfter = await treasury.lastDisbursedAmount();
            const disburseHistoricTotalAfter = await treasury.disburseHistoricTotal();
            const lastDisbursementTimestampAfter = await treasury.lastDisbursementTimestamp();

            expect(stakingBalanceAfter).not.equal(stakingBalanceBefore)
            expect(lastDisbursedAmountAfter).not.equal(lastDisbursedAmountBefore);
            expect(disburseHistoricTotalAfter).not.equal(disburseHistoricTotalBefore);
            expect(lastDisbursementTimestampAfter).not.equal(lastDisbursementTimestampBefore);
        })

        it("Should not be able to disburse before the interval", async () => {
            const currentDefaultDisburseAmount = await treasury.currentDefaultDisburseAmount()
            await expect(
                treasury.disburseToPurseStaking(currentDefaultDisburseAmount)
            ).to.be.revertedWith("Disbursement interval not reached");
        })


        it("Should update the disburseInterval value", async () => {
            //in seconds: 1 min = BigInt(60)
            //30 days is BigInt(2592000)
            const newInterval = BigInt(1)
            const tx = await treasury.updateDisburseInterval(newInterval);
            await tx.wait();
            const disburseInterval = await treasury.disburseInterval();
            expect(disburseInterval).to.equal(newInterval);
        })

        it("Should not be able to disburse due to input amount exceeding balance", async () => {

        })

        it("Should not be able to disburse due to reamining deposit less than default disburse amount", asycn() => {

        })

        it("Should be able to disburse after the interval", async () => {
            //note that treasury only disburses 1/12th of the deposited amount
            const token = await hre.ethers.getContractAt(
                BEP20ABI,
                await treasury.PURSE(),
                signer
            );
            const stakingAddress = await treasury.PURSE_STAKING();

            const stakingBalanceBefore = await token.balanceOf(stakingAddress);
            const lastDisbursedAmountBefore = await treasury.lastDisbursedAmount();
            const disburseHistoricTotalBefore = await treasury.disburseHistoricTotal();
            const lastDisbursementTimestampBefore = await treasury.lastDisbursementTimestamp();

            const currentDefaultDisburseAmount = await treasury.currentDefaultDisburseAmount()
            const tx = await treasury.disburseToPurseStaking(currentDefaultDisburseAmount);
            await tx.wait();

            const stakingBalanceAfter = await token.balanceOf(stakingAddress);
            const lastDisbursedAmountAfter = await treasury.lastDisbursedAmount();
            const disburseHistoricTotalAfter = await treasury.disburseHistoricTotal();
            const lastDisbursementTimestampAfter = await treasury.lastDisbursementTimestamp();

            expect(stakingBalanceAfter).not.equal(stakingBalanceBefore)
            expect(lastDisbursedAmountAfter).not.equal(lastDisbursedAmountBefore);
            expect(disburseHistoricTotalAfter).not.equal(disburseHistoricTotalBefore);
            expect(lastDisbursementTimestampAfter).not.equal(lastDisbursementTimestampBefore);
        })

        it("Should be able to return tokens from treasury", async () => {
            //return remaining deposit
            const token = await hre.ethers.getContractAt(
                BEP20ABI,
                await treasury.PURSE(),
                signer
            );
            const treasuryBalanceBefore = await token.balanceOf(treasuryTestnetAddress);
            const tx = await treasury.returnToken(
                await treasury.PURSE(),
                otherAccount.address,
                treasuryBalanceBefore
            );
            await tx.wait();
            const treasuryBalanceAfter = await token.balanceOf(treasuryTestnetAddress);
            expect(treasuryBalanceAfter).to.equal(BigInt(0));
        })

        it("Should not have any tokens left to disburse", async () => {
            await expect(
                treasury.disburseToPurseStaking(0)
            ).to.be.revertedWith("Insufficient tokens in Treasury");
        })
    })
})