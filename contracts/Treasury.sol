// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Treasury is Ownable {
    using SafeERC20 for IERC20;

    address public constant PURSE = 0xd66c6B4F0be8CE5b39D52E0Fd1344c389929B378;
    address public PURSE_STAKING = 0xAbCCf019ce52e7DEac396D1f1A1D9087EBF97966;
    uint256 public depositHistoricTotal;
    uint256 public disburseHistoricTotal;
    uint256 public lastDepositTimestamp;
    uint256 public lastDisbursementTimestamp;
    uint256 public disburseInterval;
    bool public isApproved;

    event UpdateDisburseInterval(uint256 indexed _days);
    event DepositPurseToTreasury(address indexed _sender, uint256 indexed _time, uint256 indexed _amount);
    event DisburseToPurseStaking(uint256 indexed _time, uint256 indexed _amount);
    event ReturnToken(address indexed _recipient, uint256 indexed _amount);

    constructor() {
        isApproved = false;
        disburseInterval = 30 days;
    }

    function updateStakingAddress(address _addr) external onlyOwner {
        require(_addr != address(0), "Cannot be a zero address");
        PURSE_STAKING = _addr;
    }

    function updateDisburseInterval(uint256 _days) external onlyOwner {
        require(_days > 0, "Days must be more than 0");
        disburseInterval = _days;
        emit UpdateDisburseInterval(_days);
    }

    // Allow Treasury to move PURSE from owner.
    // This only needs to be called once.
    function approvePurse(uint256 _decimal) external onlyOwner {
        require(isApproved == false, "Already approved");
        IERC20(PURSE).approve(address(this), 115792089237316195423570985008687907853269984665640564039457 * 10 ** _decimal);
        isApproved = true;
    }

    function depositPurseToTreasury(uint256 _amount) external onlyOwner {
        require(_amount > 0, "Amount must be more than 0");
        IERC20(PURSE).safeTransferFrom(msg.sender, address(this), _amount);
        lastDepositTimestamp = block.timestamp;
        depositHistoricTotal += _amount;
        emit DepositPurseToTreasury(msg.sender, lastDepositTimestamp, _amount);
    }

    function disburseToPurseStaking() external onlyOwner {
        require(
            block.timestamp > lastDisbursementTimestamp + disburseInterval,
            "Disbursement interval not reached."
        );
        uint256 treasuryBalance = IERC20(PURSE).balanceOf(address(this));
        require(treasuryBalance > 0, "Insufficient tokens in Treasury");
        uint256 disburseAmount = treasuryBalance / 12;
        IERC20(PURSE).safeTransfer(PURSE_STAKING, disburseAmount);

        lastDisbursementTimestamp = block.timestamp;
        disburseHistoricTotal += disburseAmount;
        emit DisburseToPurseStaking(lastDisbursementTimestamp, disburseAmount);
    }

    function returnToken(address _token, address _to, uint256 _amount) external onlyOwner {
        require(_to != address(0), "Cannot be a zero address");
        require(_amount > 0, "Amount must be more than 0");
        IERC20(_token).safeTransfer(_to, _amount);
        emit ReturnToken(_to, _amount);
    }
}
