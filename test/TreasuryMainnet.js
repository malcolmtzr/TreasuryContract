const { assert, expect } = require("chai");
require("dotenv").config();
const hre = require("hardhat");
const PURSEABI = require("./PURSE.json");

//npx hardhat test --network bscmainnet
describe("Treasury Tests", function () {
    let treasury;
    const treasuryMainnetAddress = "0x283b2cc8d51362d19b39571d0364a7Dffc7c1FcB";
    let signer;
    let otherAccount;

    beforeEach(async () => {
        const [_signer, _otherAccount] = await hre.ethers.getSigners();
        signer = _signer;
        otherAccount = await hre.ethers.getSigner("0xAbCCf019ce52e7DEac396D1f1A1D9087EBF97966")
        treasury = await hre.ethers.getContractAt(
            "Treasury",
            treasuryMainnetAddress,
            _signer
        );
    })

    describe("Non-owner test cases", function () {
        let _treasury;
        beforeEach(async () => {
            _treasury = await hre.ethers.getContractAt(
                "Treasury",
                treasuryMainnetAddress,
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
        it("Should have approval", async () => {
            const token = await hre.ethers.getContractAt(
                PURSEABI,
                await treasury.PURSE(),
                signer
            );
            const res = await token.allowance(signer.address, treasuryMainnetAddress);
            console.log(res)
            expect(res).not.equal(BigInt(0))
        })

        it("Should be the correct owner", async () => {
            const owner = await treasury.owner();
            expect(owner).to.equal(signer.address)
        })

        it("Should update the staking address", async () => {
            const stakingAddr1 = "0xFb1D31a3f51Fb9422c187492D8EA14921d6ea6aE"; //purse staking actual
            const stakingAddr2 = "0x2027E055201E26b1bFE33Eb923b3fdb7E6f30807"; //signer

            const beforeStakingAddress = await treasury.PURSE_STAKING();
            const tx = await treasury.updateStakingAddress(stakingAddr2);
            await tx.wait();
            const afterStakingAddress = await treasury.PURSE_STAKING();
            expect(afterStakingAddress).not.equal(beforeStakingAddress);
            expect(afterStakingAddress).to.equal(stakingAddr2);
        })

        it("Should deposit to treasury", async () => {
            const token = await hre.ethers.getContractAt(
                PURSEABI,
                await treasury.PURSE(),
                signer
            );

            const treasuryBalanceBefore = await token.balanceOf(treasuryMainnetAddress);
            const lastDepositedAmountBefore = await treasury.lastDepositedAmount();
            const depositHistoricTotalBefore = await treasury.depositHistoricTotal();
            const lastDepositTimeStampBefore = await treasury.lastDepositTimestamp();

            const depositAmount = ethers.parseEther("1.2")
            const tx = await treasury.depositPurseToTreasury(
                depositAmount
            );
            await tx.wait();

            const treasuryBalanceAfter = await token.balanceOf(treasuryMainnetAddress);
            const lastDepositedAmountAfter = await treasury.lastDepositedAmount();
            const depositHistoricTotalAfter = await treasury.depositHistoricTotal();
            const lastDepositTimeStampAfter = await treasury.lastDepositTimestamp();

            expect(treasuryBalanceAfter).not.equal(treasuryBalanceBefore);
            expect(lastDepositedAmountAfter).not.equal(lastDepositedAmountBefore);
            expect(lastDepositedAmountAfter).to.equal(depositAmount);
            expect(depositHistoricTotalAfter).to.equal(depositHistoricTotalBefore + depositAmount);
            expect(lastDepositTimeStampAfter).not.equal(lastDepositTimeStampBefore);
        })

        it("Should have a default disburse amount", async () => {
            const defaultDisburseAmount = await treasury.currentDefaultDisburseAmount()
            console.log(`Default disburse amount: ${defaultDisburseAmount}`)
            expect(defaultDisburseAmount).not.equal(BigInt(0))
        })

        it("Should be able to disburse once after deploying", async () => {
            //note that treasury only disburses 1/12th of the deposited amount
            const token = await hre.ethers.getContractAt(
                PURSEABI,
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
            await expect(
                treasury.disburseToPurseStaking(
                    ethers.parseEther("100")
                )
            ).to.be.revertedWith("Input disburse amount exceeds remaining deposit in Treasury")
        })

        it("Should be able to disburse after the interval", async () => {
            //note that treasury only disburses 1/12th of the deposited amount
            const token = await hre.ethers.getContractAt(
                PURSEABI,
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
            expect(lastDisbursedAmountAfter).to.equal(lastDisbursedAmountBefore);
            expect(disburseHistoricTotalAfter).not.equal(disburseHistoricTotalBefore);
            expect(lastDisbursementTimestampAfter).not.equal(lastDisbursementTimestampBefore);
        })

        it("Should not be able to disburse due to remaining deposit less than default disburse amount", async () => {
            const token = await hre.ethers.getContractAt(
                PURSEABI,
                await treasury.PURSE(),
                signer
            );
            const treasuryBalance = await token.balanceOf(treasuryMainnetAddress);
            const tx = await treasury.returnToken(
                await treasury.PURSE(),
                signer.address,
                (treasuryBalance * BigInt(99)) / BigInt(100)
            )
            await tx.wait();
            await expect(
                treasury.disburseToPurseStaking(0)
            ).to.be.revertedWith("Treasury remaining deposit is less than default disburse amount")
        })

        it("Should be able to return tokens from treasury", async () => {
            //return remaining deposit
            const token = await hre.ethers.getContractAt(
                PURSEABI,
                await treasury.PURSE(),
                signer
            );
            const treasuryBalanceBefore = await token.balanceOf(treasuryMainnetAddress);
            const tx = await treasury.returnToken(
                await treasury.PURSE(),
                otherAccount.address,
                treasuryBalanceBefore
            );
            await tx.wait();
            const treasuryBalanceAfter = await token.balanceOf(treasuryMainnetAddress);
            expect(treasuryBalanceAfter).to.equal(BigInt(0));
        })

        it("Should not have any tokens left to disburse", async () => {
            await expect(
                treasury.disburseToPurseStaking(0)
            ).to.be.revertedWith("Insufficient deposit in Treasury");
        })
    })
})