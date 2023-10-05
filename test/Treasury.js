const { assert, expect } = require("chai");
require("dotenv").config();
const hre = require("hardhat");

//npx hardhat test --network bsctestnet
describe("Treasury Tests", function () {
    let treasury;
    const treasuryTestnetAddress = "0xEB98c299BDfc5e6A6EF935D3e77a2eCe94348E58";
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

        it("Non owner should not be able to call approvePurse", async () => {
            await expect(
                _treasury.approvePurse(
                    18
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
                _treasury.disburseToPurseStaking()
            ).to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("Non owner should not be able to call returnToken", async () => {
            await expect(
                _treasury.returnToken(
                    _treasury.PURSE(),
                    otherAccount,
                    ethers.parseEther("0.001")
                )
            ).to.be.revertedWith("Ownable: caller is not the owner");
        })
    })

    describe("Owner test cases", function () {
        it("Should be the correct owner", async () => {
            const owner = await treasury.owner();
            expect(owner).to.equal(signer.address)
        })

        it("Should update the staking address", async () => {
            const stakingAddr1 = "0xFb1D31a3f51Fb9422c187492D8EA14921d6ea6aE";
            const stakingAddr2 = "0xAbCCf019ce52e7DEac396D1f1A1D9087EBF97966"; //acct2

            const beforeStakingAddress = await treasury.PURSE_STAKING();
            const tx = await treasury.updateStakingAddress(stakingAddr2);
            await tx.wait();
            const afterStakingAddress = await treasury.PURSE_STAKING();
            expect(afterStakingAddress).not.equal(beforeStakingAddress);
            expect(afterStakingAddress).to.equal(stakingAddr2);
        })

        it("Should approve the transfer of tokens", async () => {
            const isApprovedBefore = await treasury.isApproved();
            const tx = await treasury.approvePurse(18);
            await tx.wait();
            const isApprovedAfter = await treasury.isApproved();
            expect(isApprovedBefore).to.equal(false);
            expect(isApprovedAfter).to.equal(true);
        })

        it("Should deposit to treasury", async () => {
            const token = await hre.ethers.getContractAt(
                "ETH",
                await treasury.PURSE(),
                signer
            );

            const treasuryBalanceBefore = await token.balanceOf(treasuryTestnetAddress);
            const lastDepositedAmountBefore = await treasury.lastDepositedAmount();
            const depositHistoricTotalBefore = await treasury.depositHistoricTotal();

            const depositAmount = ethers.parseEther("0.1")
            const tx = await treasury.depositPurseToTreasury(
                depositAmount
            );
            await tx.wait();

            const treasuryBalanceAfter = await token.balanceOf(treasuryTestnetAddress);
            const lastDepositedAmountAfter = await treasury.lastDepositedAmount();
            const depositHistoricTotalAfter = await treasury.depositHistoricTotal();

            expect(treasuryBalanceAfter).not.equal(treasuryBalanceBefore);
            expect(lastDepositedAmountAfter).not.equal(lastDepositedAmountBefore);
            expect(lastDepositedAmountAfter).to.equal(depositAmount);
            expect(depositHistoricTotalAfter).to.equal(depositHistoricTotalBefore.add(depositAmount));
        })

        it("Should not be able to disburse before the interval", async () => {
            await expect(
                treasury.disburseToPurseStaking()
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

        it("Should be able to disburse after the interval", async () => {
            //note that treasury only disburses 1/12th of the deposited amount
            const token = await hre.ethers.getContractAt(
                "ETH",
                await treasury.PURSE(),
                signer
            );
            const stakingAddress = await treasury.PURSE_STAKING();

            const stakingBalanceBefore = await token.balanceOf(stakingAddress);
            const lastDisbursedAmountBefore = await treasury.lastDisbursedAmount();
            const disburseHistoricTotalBefore = await treasury.disburseHistoricTotal();

            const tx = await treasury.disburseToPurseStaking();
            await tx.wait();

            const stakingBalanceAfter = await token.balanceOf(stakingAddress);
            const lastDisbursedAmountAfter = await treasury.lastDisbursedAmount();
            const disburseHistoricTotalAfter = await treasury.disburseHistoricTotal();

            expect(stakingBalanceBefore).not.equal(stakingBalanceAfter)
            expect(lastDisbursedAmountAfter).not.equal(lastDisbursedAmountBefore);
            expect(disburseHistoricTotalAfter).not.equal(disburseHistoricTotalBefore);
        })

        it("Should be able to return tokens from treasury", async () => {
            //return remaining deposit
            const token = await hre.ethers.getContractAt(
                "ETH",
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
                treasury.disburseToPurseStaking()
            ).to.be.revertedWith("Insufficient tokens in Treasury");
        })
    })
})