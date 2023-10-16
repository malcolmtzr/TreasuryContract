const { assert, expect } = require("chai");
require("dotenv").config();
const hre = require("hardhat");
const BEP20ABI = require("./BEP20.json");

// npx hardhat test test/TreasuryTestnet.js --network bsctestnet
describe("Treasury Role Tests", function () {
    const treasuryTestnetAddress = "0xba3Ec8d7b4199D78Ac36Dd9094486949aD76B54d";
    let owner;
    let governor;
    let operator;

    beforeEach(async () => {
        const [_signer, _otherAccount] = await hre.ethers.getSigners();
        owner = _signer;
        governor = await hre.ethers.getSigner("0xAbCCf019ce52e7DEac396D1f1A1D9087EBF97966");
        operator = await hre.ethers.getSigner("0x9d356F4DD857fFeF5B5d48DCf30eE4d9574d708D");
    });

    describe("Access Tests", function () {
        describe("Non-governor/operator test cases", function () {
            let _treasury;
            this.beforeEach(async () => {
                _treasury = await hre.ethers.getContractAt(
                    "Treasury",
                    treasuryTestnetAddress,
                    owner
                );
            });

            it("Non governor should not be able to call depositPurseToTreasury", async () => {
                await expect(
                    _treasury.depositPurseToTreasury(
                        ethers.parseEther("1.2")
                    )
                ).to.be.revertedWithCustomError(_treasury, "AccessControlUnauthorizedAccount");
            });

            it("Non governor or operator should not be able to call governorDisburseToPurseStaking", async () => {
                await expect(
                    _treasury.governorDisburseToPurseStaking(
                        ethers.parseEther("0")
                    )
                ).to.be.revertedWithCustomError(_treasury, "AccessControlUnauthorizedAccount");
            });
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

            it("Non owner should not be able to call updateMonthRange", async () => {
                await expect(
                    _treasury.updateMonthRange(1)
                ).to.be.revertedWithCustomError(_treasury, "AccessControlUnauthorizedAccount");
            });

            it("Non owner should not be able to call updateStakingAddress", async () => {
                await expect(
                    _treasury.updateStakingAddress(
                        "0xFb1D31a3f51Fb9422c187492D8EA14921d6ea6aE"
                    )
                ).to.be.revertedWithCustomError(_treasury, "AccessControlUnauthorizedAccount");
            });

            it("Non owner should not be able to call updateDisburseInterval", async () => {
                await expect(
                    _treasury.updateDisburseInterval(
                        1
                    )
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

            it("Governor should be able to deposit to Treasury", async () => {
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

                const treasuryBalanceBefore = await token.balanceOf(treasuryTestnetAddress);
                const depositHistoricTotalBefore = await treasury.depositHistoricTotal();
                const lastDepositedTreasuryBalanceBefore = await treasury.lastDepositedTreasuryBalanceBefore();

                const depositTx = await treasury.depositPurseToTreasury(depositAmount);
                await depositTx.wait();

                const treasuryBalanceAfter = await token.balanceOf(treasuryTestnetAddress);
                const depositHistoricTotalAfter = await treasury.depositHistoricTotal();
                const lastDepositedTreasuryBalanceAfter = await treasury.lastDepositedTreasuryBalanceBefore();

                expect(treasuryBalanceAfter).not.equal(treasuryBalanceBefore);
                expect(depositHistoricTotalAfter).not.equal(depositHistoricTotalBefore);
                expect(lastDepositedTreasuryBalanceAfter).not.equal(lastDepositedTreasuryBalanceBefore);
            });

            it("Treasury should have a default disburse amount", async () => {
                const defaultDisburseAmount = await treasury.currentDefaultDisburseAmount();
                expect(defaultDisburseAmount).not.equal(BigInt(0));
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
            it("Owner should be able to update month range", async () => {
                const rangeBefore = await treasury.range();
                const tx1 = await treasury.updateMonthRange(1);
                await tx1.wait();
                const rangeAfter = await treasury.range();
                expect(rangeAfter).not.equal(rangeBefore);

                const tx2 = await treasury.updateMonthRange(12);
                await tx2.wait();
                const rangeChanged = await treasury.range();
                expect(rangeChanged).to.equal(rangeBefore);
            });

            it("Update month range should not exceed 12 months", async () => {
                await expect(
                    treasury.updateMonthRange(13)
                ).to.be.revertedWith("Months cannot exceed 12");
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

                const currentDefaultDisburseAmount = await treasury.currentDefaultDisburseAmount()
                const tx = await treasury.ownerDisburseToPurseStaking(currentDefaultDisburseAmount);
                await tx.wait();

                const stakingBalanceAfter = await token.balanceOf(stakingAddress);
                const disburseHistoricTotalAfter = await treasury.disburseHistoricTotal();
                const lastDisbursementTimestampAfter = await treasury.lastDisbursementTimestamp();

                expect(stakingBalanceAfter).not.equal(stakingBalanceBefore)
                expect(disburseHistoricTotalAfter).not.equal(disburseHistoricTotalBefore);
                expect(lastDisbursementTimestampAfter).not.equal(lastDisbursementTimestampBefore);
            });

            it("Owner should not be able to disburse before the interval", async () => {
                const currentDefaultDisburseAmount = await treasury.currentDefaultDisburseAmount()
                await expect(
                    treasury.ownerDisburseToPurseStaking(currentDefaultDisburseAmount)
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

                const currentDefaultDisburseAmount = await treasury.currentDefaultDisburseAmount()
                const tx = await treasury.ownerDisburseToPurseStaking(currentDefaultDisburseAmount);
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

            });
        });
    });

    describe("GOVERNOR & OPERATOR Disburse Tests", function () {
        describe("Owner Set operator role", function () {
            let treasury;
            before(async () => {
                treasury = await hre.ethers.getContractAt(
                    "Treasury",
                    treasuryTestnetAddress,
                    owner
                );
            });
            it("Owner should be able set operator role", async () => {
                const OPERATOR_ROLE = "0x4f50455241544f525f524f4c4500000000000000000000000000000000000000";
                const tx = await treasury.grantRole(
                    OPERATOR_ROLE,
                    operator.address
                );
                const txReceipt = await tx.wait();
                expect(txReceipt.status).to.equal(1);
            });
        });

        describe("Governor's Disbursement", function () {
            let treasury;
            before(async () => {
                treasury = await hre.ethers.getContractAt(
                    "Treasury",
                    treasuryTestnetAddress,
                    governor
                );
            });
            it("Governor should be able to disburse", async () => {
                const token = await hre.ethers.getContractAt(
                    BEP20ABI,
                    await treasury.PURSE(),
                    governor
                );
                const depositAmount = ethers.parseEther("1.0");
                const sendTx = await token.transfer(
                    treasuryTestnetAddress,
                    depositAmount
                );
                await sendTx.wait();

                //governor disburse 0.5
            });
        });

        describe("Operator's Disbursement", function () {
            let treasury;
            before(async () => {
                treasury = await hre.ethers.getContractAt(
                    "Treasury",
                    treasuryTestnetAddress,
                    operator
                );
            });
            it("Operator should be able to disburse", async () => {
                //operator disburse 0.5
            });
        })

    });

    // describe("Owner test cases", function () {
    //     it("Should have approval", async () => {
    //         const token = await hre.ethers.getContractAt(
    //             BEP20ABI,
    //             await treasury.PURSE(),
    //             signer
    //         );
    //         const res = await token.allowance(signer.address, treasuryTestnetAddress);
    //         expect(res).not.equal(BigInt(0))
    //     })

    //     it("Should be the correct owner", async () => {
    //         const owner = await treasury.owner();
    //         expect(owner).to.equal(signer.address)
    //     })

    //     it("Should update the staking address", async () => {
    //         const stakingAddr1 = "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd";
    //         const stakingAddr2 = "0xAbCCf019ce52e7DEac396D1f1A1D9087EBF97966"; //acct2

    //         const beforeStakingAddress = await treasury.PURSE_STAKING();
    //         const tx = await treasury.updateStakingAddress(stakingAddr2);
    //         await tx.wait();
    //         const afterStakingAddress = await treasury.PURSE_STAKING();
    //         expect(afterStakingAddress).not.equal(beforeStakingAddress);
    //         expect(afterStakingAddress).to.equal(stakingAddr2);
    //     })

    //     it("Should deposit to treasury", async () => {
    //         const token = await hre.ethers.getContractAt(
    //             BEP20ABI,
    //             await treasury.PURSE(),
    //             signer
    //         );

    //         const treasuryBalanceBefore = await token.balanceOf(treasuryTestnetAddress);
    //         const lastDepositedAmountBefore = await treasury.lastDepositedAmount();
    //         const depositHistoricTotalBefore = await treasury.depositHistoricTotal();
    //         const lastDepositTimeStampBefore = await treasury.lastDepositTimestamp();

    //         const depositAmount = ethers.parseEther("1.2")
    //         const tx = await treasury.depositPurseToTreasury(
    //             depositAmount
    //         );
    //         await tx.wait();

    //         const treasuryBalanceAfter = await token.balanceOf(treasuryTestnetAddress);
    //         const lastDepositedAmountAfter = await treasury.lastDepositedAmount();
    //         const depositHistoricTotalAfter = await treasury.depositHistoricTotal();
    //         const lastDepositTimeStampAfter = await treasury.lastDepositTimestamp();

    //         expect(treasuryBalanceAfter).not.equal(treasuryBalanceBefore);
    //         expect(lastDepositedAmountAfter).not.equal(lastDepositedAmountBefore);
    //         expect(lastDepositedAmountAfter).to.equal(depositAmount);
    //         expect(depositHistoricTotalAfter).to.equal(depositHistoricTotalBefore + depositAmount);
    //         expect(lastDepositTimeStampAfter).not.equal(lastDepositTimeStampBefore);
    //     })

    //     it("Should have a default disburse amount", async () => {
    //         const defaultDisburseAmount = await treasury.currentDefaultDisburseAmount()
    //         console.log(defaultDisburseAmount)
    //         expect(defaultDisburseAmount).not.equal(BigInt(0))
    //     })

    //     it("Should be able to disburse once after deploying", async () => {
    //         //note that treasury only disburses 1/12th of the deposited amount
    //         const token = await hre.ethers.getContractAt(
    //             BEP20ABI,
    //             await treasury.PURSE(),
    //             signer
    //         );
    //         const stakingAddress = await treasury.PURSE_STAKING();

    //         const stakingBalanceBefore = await token.balanceOf(stakingAddress);
    //         const lastDisbursedAmountBefore = await treasury.lastDisbursedAmount();
    //         const disburseHistoricTotalBefore = await treasury.disburseHistoricTotal();
    //         const lastDisbursementTimestampBefore = await treasury.lastDisbursementTimestamp();

    //         const currentDefaultDisburseAmount = await treasury.currentDefaultDisburseAmount()
    //         const tx = await treasury.ownerDisburseToPurseStaking(currentDefaultDisburseAmount);
    //         await tx.wait();

    //         const stakingBalanceAfter = await token.balanceOf(stakingAddress);
    //         const lastDisbursedAmountAfter = await treasury.lastDisbursedAmount();
    //         const disburseHistoricTotalAfter = await treasury.disburseHistoricTotal();
    //         const lastDisbursementTimestampAfter = await treasury.lastDisbursementTimestamp();

    //         expect(stakingBalanceAfter).not.equal(stakingBalanceBefore)
    //         expect(lastDisbursedAmountAfter).not.equal(lastDisbursedAmountBefore);
    //         expect(disburseHistoricTotalAfter).not.equal(disburseHistoricTotalBefore);
    //         expect(lastDisbursementTimestampAfter).not.equal(lastDisbursementTimestampBefore);
    //     })

    //     it("Should not be able to disburse before the interval", async () => {
    //         const currentDefaultDisburseAmount = await treasury.currentDefaultDisburseAmount()
    //         await expect(
    //             treasury.ownerDisburseToPurseStaking(currentDefaultDisburseAmount)
    //         ).to.be.revertedWith("Disbursement interval not reached");
    //     })


    //     it("Should update the disburseInterval value", async () => {
    //         //in seconds: 1 min = BigInt(60)
    //         //30 days is BigInt(2592000)
    //         const newInterval = BigInt(1)
    //         const tx = await treasury.updateDisburseInterval(newInterval);
    //         await tx.wait();
    //         const disburseInterval = await treasury.disburseInterval();
    //         expect(disburseInterval).to.equal(newInterval);
    //     })

    //     it("Should not be able to disburse due to input amount exceeding balance", async () => {
    //         await expect(
    //             treasury.ownerDisburseToPurseStaking(
    //                 ethers.parseEther("100")
    //             )
    //         ).to.be.revertedWith("Input disburse amount exceeds remaining deposit in Treasury")
    //     })

    //     it("Should be able to disburse after the interval", async () => {
    //         //note that treasury only disburses 1/12th of the deposited amount
    //         const token = await hre.ethers.getContractAt(
    //             BEP20ABI,
    //             await treasury.PURSE(),
    //             signer
    //         );
    //         const stakingAddress = await treasury.PURSE_STAKING();

    //         const stakingBalanceBefore = await token.balanceOf(stakingAddress);
    //         const lastDisbursedAmountBefore = await treasury.lastDisbursedAmount();
    //         const disburseHistoricTotalBefore = await treasury.disburseHistoricTotal();
    //         const lastDisbursementTimestampBefore = await treasury.lastDisbursementTimestamp();

    //         const currentDefaultDisburseAmount = await treasury.currentDefaultDisburseAmount()
    //         const tx = await treasury.ownerDisburseToPurseStaking(currentDefaultDisburseAmount);
    //         await tx.wait();

    //         const stakingBalanceAfter = await token.balanceOf(stakingAddress);
    //         const lastDisbursedAmountAfter = await treasury.lastDisbursedAmount();
    //         const disburseHistoricTotalAfter = await treasury.disburseHistoricTotal();
    //         const lastDisbursementTimestampAfter = await treasury.lastDisbursementTimestamp();

    //         expect(stakingBalanceAfter).not.equal(stakingBalanceBefore)
    //         expect(lastDisbursedAmountAfter).to.equal(lastDisbursedAmountBefore);
    //         expect(disburseHistoricTotalAfter).not.equal(disburseHistoricTotalBefore);
    //         expect(lastDisbursementTimestampAfter).not.equal(lastDisbursementTimestampBefore);
    //     })

    //     it("Should not be able to disburse due to remaining deposit less than default disburse amount", async () => {
    //         const token = await hre.ethers.getContractAt(
    //             BEP20ABI,
    //             await treasury.PURSE(),
    //             signer
    //         );
    //         const treasuryBalance = await token.balanceOf(treasuryTestnetAddress);
    //         const tx = await treasury.returnToken(
    //             await treasury.PURSE(),
    //             signer.address,
    //             BigInt(treasuryBalance) - BigInt(ethers.parseEther("0.05"))
    //         )
    //         await tx.wait();
    //         await expect(
    //             treasury.ownerDisburseToPurseStaking(0)
    //         ).to.be.revertedWith("Treasury remaining deposit is less than default disburse amount")
    //     })

    //     it("Should be able to return tokens from treasury", async () => {
    //         //return remaining deposit
    //         const token = await hre.ethers.getContractAt(
    //             BEP20ABI,
    //             await treasury.PURSE(),
    //             signer
    //         );
    //         const treasuryBalanceBefore = await token.balanceOf(treasuryTestnetAddress);
    //         const tx = await treasury.returnToken(
    //             await treasury.PURSE(),
    //             otherAccount.address,
    //             treasuryBalanceBefore
    //         );
    //         await tx.wait();
    //         const treasuryBalanceAfter = await token.balanceOf(treasuryTestnetAddress);
    //         expect(treasuryBalanceAfter).to.equal(BigInt(0));
    //     })

    //     it("Should not have any tokens left to disburse", async () => {
    //         await expect(
    //             treasury.ownerDisburseToPurseStaking(0)
    //         ).to.be.revertedWith("Insufficient deposit in Treasury");
    //     })
    // })
})