// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Treasury is Ownable {
    using SafeERC20 for IERC20;

    address public constant PURSE = 0x337610d27c682E347C9cD60BD4b3b107C9d34dDd;
    address public PURSE_STAKING = 0x337610d27c682E347C9cD60BD4b3b107C9d34dDd;
    uint256 public depositHistoricTotal;
    uint256 public disburseHistoricTotal;
    uint256 public lastDepositedAmount;
    uint256 public lastDepositTimestamp;
    uint256 public lastDisbursedAmount;
    uint256 public lastDisbursementTimestamp;
    uint256 public disburseInterval;

    event UpdateDisburseInterval(uint256 indexed _days);
    event DepositPurseToTreasury(address indexed _sender, uint256 indexed _time, uint256 indexed _amount);
    event DisburseToPurseStaking(uint256 indexed _time, uint256 indexed _amount);
    event ReturnToken(address indexed _recipient, uint256 indexed _amount);

    constructor() {
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

    function depositPurseToTreasury(uint256 _amount) external onlyOwner {
        require(_amount > 0, "Amount must be more than 0");
        IERC20(PURSE).safeTransferFrom(msg.sender, address(this), _amount);
        lastDepositedAmount = _amount;
        lastDepositTimestamp = block.timestamp;
        depositHistoricTotal += _amount;
        emit DepositPurseToTreasury(msg.sender, lastDepositTimestamp, _amount);
    }

    function currentDefaultDisburseAmount() public view onlyOwner returns (uint256) {
        uint256 res = lastDepositedAmount / 12;
        return res;
    }

    //set _amount as 0 to disburse default amount based on lastDepositedAmount
    function disburseToPurseStaking(uint256 _amount) external onlyOwner {
        require(
            block.timestamp > lastDisbursementTimestamp + disburseInterval,
            "Disbursement interval not reached"
        );
        uint256 treasuryBalance = IERC20(PURSE).balanceOf(address(this));
        require(treasuryBalance > 0, "Insufficient deposit in Treasury");
        require(_amount <= treasuryBalance, "Input disburse amount exceeds remaining deposit in Treasury");
        uint256 disburseAmount;
        if (_amount > 0) {
            disburseAmount = _amount;
        } else {
            require(
                treasuryBalance >= currentDefaultDisburseAmount(),
                "Treasury remaining deposit is less than default disburse amount"
            );
            disburseAmount = currentDefaultDisburseAmount();
        }
        IERC20(PURSE).safeTransfer(PURSE_STAKING, disburseAmount);
        lastDisbursedAmount = disburseAmount;
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
