const { assert, expect } = require("chai");
require("dotenv").config();
const hre = require("hardhat");
const BEP20ABI = require("./BEP20.json");
require("dotenv").config();

// npx hardhat test test/TreasuryTestnet.js --network bsctestnet
describe("Treasury Tests", function () {
    const treasuryTestnetAddress = "0x0C1691F11F7E0E65eD7Db49f99D4a4C8dc446A7D";
    let owner;
    let governor;
    let operator;

    beforeEach(async () => {
        const signers = await hre.ethers.getSigners();
        owner = signers[0];
        governor = signers[1];
        operator = signers[2];
    });

    describe("Access Tests", function () {
        describe("Non-governor/operator test cases", function () {
            let _treasury;
            beforeEach(async () => {
                _treasury = await hre.ethers.getContractAt(
                    "Treasury",
                    treasuryTestnetAddress,
                    owner
                );
            });

            it("Non governor role should not be able to call updatePurseTreasury", async () => {
                await expect(
                    _treasury.updatePurseTreasury(true)
                ).to.be.revertedWithCustomError(_treasury, "AccessControlUnauthorizedAccount");
                let _treasury0 = await hre.ethers.getContractAt(
                    "Treasury",
                    treasuryTestnetAddress,
                    operator
                );
                await expect(
                    _treasury0.updatePurseTreasury(true)
                ).to.be.revertedWithCustomError(_treasury0, "AccessControlUnauthorizedAccount");
            });

            it("Non operator role should not be able to call disburseToPurseStaking", async () => {
                await expect(
                    _treasury.disburseToPurseStaking()
                ).to.be.revertedWithCustomError(_treasury, "AccessControlUnauthorizedAccount");
                let _treasury0 = await hre.ethers.getContractAt(
                    "Treasury",
                    treasuryTestnetAddress,
                    operator //operator is not assigned operator role yet
                );
                await expect(
                    _treasury0.disburseToPurseStaking()
                ).to.be.revertedWithCustomError(_treasury0, "AccessControlUnauthorizedAccount");
                let _treasury1 = await hre.ethers.getContractAt(
                    "Treasury",
                    treasuryTestnetAddress,
                    governor //governor is not assigned operator role yet
                );
                await expect(
                    _treasury1.disburseToPurseStaking()
                ).to.be.revertedWithCustomError(_treasury1, "AccessControlUnauthorizedAccount");
            })
        });

        describe("Non-owner test cases", function () {
            let _treasury;
            beforeEach(async () => {
                _treasury = await hre.ethers.getContractAt(
                    "Treasury",
                    treasuryTestnetAddress,
                    governor
                );
            });

            it("Non owner should not be able to call ownerDisburseToPurseStaking", async () => {
                await expect(
                    _treasury.ownerDisburseToPurseStaking(
                        ethers.parseEther("0")
                    )
                ).to.be.revertedWithCustomError(_treasury, "AccessControlUnauthorizedAccount");
            });

            it("Non owner should not be able to call updateDisburseRange", async () => {
                await expect(
                    _treasury.updateDisburseRange(1)
                ).to.be.revertedWithCustomError(_treasury, "AccessControlUnauthorizedAccount");
            });

            it("Non owner should not be able to call updateStakingAddress", async () => {
                await expect(
                    _treasury.updateStakingAddress("0xFb1D31a3f51Fb9422c187492D8EA14921d6ea6aE")
                ).to.be.revertedWithCustomError(_treasury, "AccessControlUnauthorizedAccount");
            });

            it("Non owner should not be able to call updateDisburseInterval", async () => {
                await expect(
                    _treasury.updateDisburseInterval(1)
                ).to.be.revertedWithCustomError(_treasury, "AccessControlUnauthorizedAccount");
            });

            it("Non owner should not be able to call returnToken", async () => {
                await expect(
                    _treasury.returnToken(
                        _treasury.PURSE(),
                        governor,
                        ethers.parseEther("0.1")
                    )
                ).to.be.revertedWithCustomError(_treasury, "AccessControlUnauthorizedAccount");
            });
        });
    });

    describe("Despoit to Treasury Tests", function () {
        describe("Governor's Deposit", function () {
            let treasury;
            beforeEach(async () => {
                treasury = await hre.ethers.getContractAt(
                    "Treasury",
                    treasuryTestnetAddress,
                    governor
                );
            })

            it("Governor should be able to deposit to Treasury and update state variables appropriately", async () => {
                const token = await hre.ethers.getContractAt(
                    BEP20ABI,
                    await treasury.PURSE(),
                    governor
                );
                const depositAmount = ethers.parseEther("1.2");
                const sendTx = await token.transfer(
                    treasuryTestnetAddress,
                    depositAmount
                );
                await sendTx.wait();

                const treasuryBalanceTransferred = await token.balanceOf(treasuryTestnetAddress);
                const depositHistoricTotalBefore = await treasury.depositHistoricTotal();
                const lastUpdatedTimestampBefore = await treasury.lastUpdatedTimestamp();
                const lastUpdatedTreasuryBalanceBefore = await treasury.lastUpdatedTreasuryBalance();
                const lastDisbursementTimestampBefore = await treasury.lastDisbursementTimestamp();
                const defaultDisbursePerIntervalBefore = await treasury.defaultDisbursePerInterval();

                const updateTx = await treasury.updatePurseTreasury(false);
                await updateTx.wait();

                const treasuryBalanceAfter = await token.balanceOf(treasuryTestnetAddress);
                const depositHistoricTotalAfter = await treasury.depositHistoricTotal();
                const lastUpdatedTimestampAfter = await treasury.lastUpdatedTimestamp();
                const lastUpdatedTreasuryBalanceAfter = await treasury.lastUpdatedTreasuryBalance();
                const lastDisbursementTimestampAfter = await treasury.lastDisbursementTimestamp();
                const defaultDisbursePerIntervalAfter = await treasury.defaultDisbursePerInterval();

                expect(treasuryBalanceAfter).to.equal(treasuryBalanceTransferred);
                expect(depositHistoricTotalAfter).to.equal(depositHistoricTotalBefore);
                expect(lastUpdatedTimestampAfter).not.equal(lastUpdatedTimestampBefore);
                expect(lastUpdatedTreasuryBalanceAfter).not.equal(lastUpdatedTreasuryBalanceBefore);
                expect(lastDisbursementTimestampAfter).to.equal(lastDisbursementTimestampBefore);
                expect(defaultDisbursePerIntervalAfter).not.equal(defaultDisbursePerIntervalBefore);
            });

            it("Treasury should have a non zero currentDisburseAmount", async () => {
                const currentDisburseAmount = await treasury.currentDisburseAmount();
                expect(currentDisburseAmount).not.equal(BigInt(0));
            });
        });
    })

    describe("Owner Function Tests", function () {
        let treasury;
        let token;
        beforeEach(async () => {
            treasury = await hre.ethers.getContractAt(
                "Treasury",
                treasuryTestnetAddress,
                owner
            );
            token = await hre.ethers.getContractAt(
                BEP20ABI,
                await treasury.PURSE(),
                owner
            );
        });

        describe("Update Treasury Parameters", function () {
            it("Owner should be able to update disburse range", async () => {
                const rangeBefore = await treasury.range();
                const tx1 = await treasury.updateDisburseRange(1);
                await tx1.wait();
                const rangeAfter = await treasury.range();
                expect(rangeAfter).not.equal(rangeBefore);

                const tx2 = await treasury.updateDisburseRange(12);
                await tx2.wait();
                const rangeChanged = await treasury.range();
                expect(rangeChanged).to.equal(rangeBefore);
            });

            it("Update disburse range cannot be zero", async () => {
                await expect(
                    treasury.updateDisburseRange(0)
                ).to.be.revertedWith("Disburse range cannot be 0");
            });

            it("Owner should be able to update staking address", async () => {
                const newStakingAddr = "0x2027E055201E26b1bFE33Eb923b3fdb7E6f30807"; //signer
                const beforeStakingAddress = await treasury.PURSE_STAKING();
                const tx = await treasury.updateStakingAddress(newStakingAddr);
                await tx.wait();
                const afterStakingAddress = await treasury.PURSE_STAKING();
                expect(afterStakingAddress).not.equal(beforeStakingAddress);
                expect(afterStakingAddress).to.equal(newStakingAddr);
            });
        });

        describe("Owner's Disbursement", function () {
            it("Owner should be able to disburse the very first time after deployment", async () => {
                const stakingAddress = await treasury.PURSE_STAKING();

                const stakingBalanceBefore = await token.balanceOf(stakingAddress);
                const disburseHistoricTotalBefore = await treasury.disburseHistoricTotal();
                const lastDisbursementTimestampBefore = await treasury.lastDisbursementTimestamp();

                const tx = await treasury.ownerDisburseToPurseStaking(0);
                await tx.wait();

                const stakingBalanceAfter = await token.balanceOf(stakingAddress);
                const disburseHistoricTotalAfter = await treasury.disburseHistoricTotal();
                const lastDisbursementTimestampAfter = await treasury.lastDisbursementTimestamp();

                expect(stakingBalanceAfter).not.equal(stakingBalanceBefore)
                expect(disburseHistoricTotalAfter).not.equal(disburseHistoricTotalBefore);
                expect(lastDisbursementTimestampAfter).not.equal(lastDisbursementTimestampBefore);
            });

            it("Owner should not be able to disburse before the interval", async () => {
                await expect(
                    treasury.ownerDisburseToPurseStaking(0)
                ).to.be.revertedWith("Disbursement interval not reached");
            });

            it("Owner should be able to update the disburse interval", async () => {
                //in seconds: 1 min = BigInt(60)
                //30 days is BigInt(2592000)
                const disburseIntervalBefore = await treasury.disburseInterval();
                const newInterval = BigInt(1);
                const tx = await treasury.updateDisburseInterval(newInterval);
                await tx.wait();
                const disburseIntervalAfter = await treasury.disburseInterval();
                expect(disburseIntervalAfter).not.equal(disburseIntervalBefore);
                expect(disburseIntervalAfter).to.equal(newInterval);
            });

            it("Owner should not be able to disburse due to input amount exceeding balance", async () => {
                await expect(
                    treasury.ownerDisburseToPurseStaking(
                        ethers.parseEther("100")
                    )
                ).to.be.revertedWith("Treasury remaining deposit is less than disburse amount");
            });

            it("Owner should be able to disburse after the interval", async () => {
                const stakingAddress = await treasury.PURSE_STAKING();

                const stakingBalanceBefore = await token.balanceOf(stakingAddress);
                const disburseHistoricTotalBefore = await treasury.disburseHistoricTotal();
                const lastDisbursementTimestampBefore = await treasury.lastDisbursementTimestamp();

                const tx = await treasury.ownerDisburseToPurseStaking(0);
                await tx.wait();

                const stakingBalanceAfter = await token.balanceOf(stakingAddress);
                const disburseHistoricTotalAfter = await treasury.disburseHistoricTotal();
                const lastDisbursementTimestampAfter = await treasury.lastDisbursementTimestamp();

                expect(stakingBalanceAfter).not.equal(stakingBalanceBefore)
                expect(disburseHistoricTotalAfter).not.equal(disburseHistoricTotalBefore);
                expect(lastDisbursementTimestampAfter).not.equal(lastDisbursementTimestampBefore);
            });

            it("Owner should not be able to disburse due to remaining deposit less than default disburse amount", async () => {
                const treasuryBalance = await token.balanceOf(treasuryTestnetAddress);
                const tx = await treasury.returnToken(
                    await treasury.PURSE(),
                    owner.address,
                    (treasuryBalance * BigInt(99)) / BigInt(100)
                )
                await tx.wait();
                await expect(
                    treasury.ownerDisburseToPurseStaking(0)
                ).to.be.revertedWith("Treasury remaining deposit is less than disburse amount");
            });

            it("Owner should be able to return tokens from treasury", async () => {
                const treasuryBalance = await token.balanceOf(treasuryTestnetAddress);
                const tx = await treasury.returnToken(
                    treasury.PURSE(),
                    owner.address,
                    treasuryBalance
                );
                await tx.wait();
                const treasuryBalanceNew = await token.balanceOf(treasuryTestnetAddress);
                expect(treasuryBalanceNew).not.equal(treasuryBalance);
                expect(treasuryBalanceNew).to.equal(BigInt(0));
            });

            it("Treasury should not have any tokens left to disburse", async () => {
                await expect(
                    treasury.ownerDisburseToPurseStaking(0)
                ).to.be.revertedWith("Treasury remaining deposit is less than disburse amount");
            });
        });
    });

    describe("GOVERNOR & OPERATOR Disbursement Tests", function () {
        describe("Owner set operator role", function () {
            const OPERATOR_ROLE = "0x4f50455241544f525f524f4c4500000000000000000000000000000000000000";
            let treasury;
            beforeEach(async () => {
                treasury = await hre.ethers.getContractAt(
                    "Treasury",
                    treasuryTestnetAddress,
                    owner
                );
            });

            it("Owner should be able set operator role for the governor", async () => {
                const tx = await treasury.grantRole(
                    OPERATOR_ROLE,
                    governor.address
                );
                const txReceipt = await tx.wait();
                expect(txReceipt.status).to.equal(1);
                const test = await treasury.hasRole(
                    OPERATOR_ROLE,
                    governor.address
                );
                expect(test).to.equal(true);
            });

            it("Owner should be able to set operator role for the operator", async () => {
                const tx = await treasury.grantRole(
                    OPERATOR_ROLE,
                    operator.address
                );
                const txReceipt = await tx.wait();
                expect(txReceipt.status).to.equal(1);
                const test = await treasury.hasRole(
                    OPERATOR_ROLE,
                    operator.address
                );
                expect(test).to.equal(true);
            });

            it("Owner should update the range to deplete deposit after next two disbursements", async () => {
                const tx = await treasury.updateDisburseRange(2);
                await tx.wait();
                const rangeChanged = await treasury.range();
                expect(rangeChanged).to.equal(BigInt(2));
            });
        });

        describe("Governor's Disbursement", function () {
            let treasury;
            let token;
            before(async () => {
                treasury = await hre.ethers.getContractAt(
                    "Treasury",
                    treasuryTestnetAddress,
                    governor
                );
                token = await hre.ethers.getContractAt(
                    BEP20ABI,
                    await treasury.PURSE(),
                    governor
                );
            });
            it("Governor should be able to disburse", async () => {
                const depositAmount = ethers.parseEther("2.0");
                const sendTx = await token.transfer(
                    treasuryTestnetAddress,
                    depositAmount
                );
                await sendTx.wait();

                const updateTx = await treasury.updatePurseTreasury(false);
                await updateTx.wait();

                const stakingAddress = await treasury.PURSE_STAKING();

                const stakingBalanceBefore = await token.balanceOf(stakingAddress);
                const disburseHistoricTotalBefore = await treasury.disburseHistoricTotal();
                const lastDisbursementTimestampBefore = await treasury.lastDisbursementTimestamp();

                const tx = await treasury.disburseToPurseStaking();
                await tx.wait();

                const stakingBalanceAfter = await token.balanceOf(stakingAddress);
                const disburseHistoricTotalAfter = await treasury.disburseHistoricTotal();
                const lastDisbursementTimestampAfter = await treasury.lastDisbursementTimestamp();

                expect(stakingBalanceAfter).not.equal(stakingBalanceBefore)
                expect(disburseHistoricTotalAfter).not.equal(disburseHistoricTotalBefore);
                expect(lastDisbursementTimestampAfter).not.equal(lastDisbursementTimestampBefore);
            });
        });

        describe("Operator's Disbursement", function () {
            let treasury;
            let token;
            before(async () => {
                treasury = await hre.ethers.getContractAt(
                    "Treasury",
                    treasuryTestnetAddress,
                    operator
                );
                token = await hre.ethers.getContractAt(
                    BEP20ABI,
                    await treasury.PURSE(),
                    operator
                );
            });
            it("Operator should be able to disburse", async () => {
                await new Promise(resolve => setTimeout(resolve, 10000));
                const stakingAddress = await treasury.PURSE_STAKING();

                const stakingBalanceBefore = await token.balanceOf(stakingAddress);
                const disburseHistoricTotalBefore = await treasury.disburseHistoricTotal();
                const lastDisbursementTimestampBefore = await treasury.lastDisbursementTimestamp();

                const tx = await treasury.disburseToPurseStaking();
                await tx.wait();

                const stakingBalanceAfter = await token.balanceOf(stakingAddress);
                const disburseHistoricTotalAfter = await treasury.disburseHistoricTotal();
                const lastDisbursementTimestampAfter = await treasury.lastDisbursementTimestamp();

                expect(stakingBalanceAfter).not.equal(stakingBalanceBefore)
                expect(disburseHistoricTotalAfter).not.equal(disburseHistoricTotalBefore);
                expect(lastDisbursementTimestampAfter).not.equal(lastDisbursementTimestampBefore);
            });
        });

        describe("Final check", function () {
            let treasury;
            let token;
            before(async () => {
                treasury = await hre.ethers.getContractAt(
                    "Treasury",
                    treasuryTestnetAddress,
                    owner
                );
                token = await hre.ethers.getContractAt(
                    BEP20ABI,
                    await treasury.PURSE(),
                    owner
                );
                const tx2 = await treasury.updateDisburseRange(12);
                await tx2.wait();
                const rangeChanged = await treasury.range();
                expect(rangeChanged).to.equal(BigInt(12));
            });
            it("Treasury should have zero deposit", async () => {
                const treasuryBalance = await token.balanceOf(treasuryTestnetAddress);
                expect(treasuryBalance).to.equal(BigInt(0));
            });
        })
    });
})