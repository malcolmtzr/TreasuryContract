// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./Governable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

contract Treasury is Initializable, Governable {
    using SafeERC20 for ERC20Upgradeable;

    address public constant PURSE = 0x29a63F4B209C29B4DC47f06FFA896F32667DAD2C;
    address public PURSE_STAKING;
    uint256 public depositHistoricTotal;
    uint256 public disburseHistoricTotal;
    uint256 public lastDepositedAmount;
    uint256 public lastDepositTimestamp;
    uint256 public lastDisbursedAmount;
    uint256 public lastDisbursementTimestamp;
    uint256 public disburseInterval;
    uint256 public range;

    event UpdateDisburseInterval(uint256 indexed _days);
    event DepositPurseToTreasury(address indexed _sender, uint256 indexed _time, uint256 indexed _amount);
    event DisburseToPurseStaking(uint256 indexed _time, uint256 indexed _amount);
    event ReturnToken(address indexed _recipient, uint256 indexed _amount);

    modifier onlyOwnerRole() {
        require(hasRole(OWNER_ROLE, msg.sender), "Caller does not have the role: OWNER_ROLE");
        _;
    }

    modifier onlyGovernorRole() {
        require(hasRole(GOVERNOR_ROLE, msg.sender), "Caller does not have the role: GOVERNOR_ROLE");
        _;
    }

    function initialize(address _owner, address _governor) public initializer {
        __Governable_init(_owner, _governor);
        PURSE_STAKING = 0xFb1D31a3f51Fb9422c187492D8EA14921d6ea6aE;
        disburseInterval = 30 days;
        range = 12;
    }

    function updateStakingAddress(address _addr) external onlyOwnerRole {
        require(_addr != address(0), "Cannot be a zero address");
        PURSE_STAKING = _addr;
    }

    function updateDisburseInterval(uint256 _days) external onlyOwnerRole {
        require(_days > 0, "Days must be more than 0");
        disburseInterval = _days;
        emit UpdateDisburseInterval(_days);
    }

    function updateMonthRange(uint256 _months) external onlyOwnerRole {
        require(_months <= 12, "Months cannot exceed 12");
        range = _months;
    }

    function depositPurseToTreasury(uint256 _amount) external onlyOwnerRole {
        require(_amount > 0, "Amount must be more than 0");
        require(
            _amount <= IERC20(PURSE).balanceOf(address(this)), 
            "Input amount exceeded treasury balance"
        );
        lastDepositedAmount = _amount;
        lastDepositTimestamp = block.timestamp;
        depositHistoricTotal += _amount;
        emit DepositPurseToTreasury(msg.sender, lastDepositTimestamp, _amount);
    }

    function currentDefaultDisburseAmount() public view returns (uint256) {
        return lastDepositedAmount / range;
    }

    function governorDisburseToPurseStaking(uint256 _reqAmount) external onlyGovernorRole {
        require(
            block.timestamp > lastDisbursementTimestamp + disburseInterval,
            "Disbursement interval not reached"
        );
        uint256 treasuryBalance = IERC20(PURSE).balanceOf(address(this));
        require(treasuryBalance > 0, "Insufficient deposit in Treasury");
        //require(_reqAmount <= treasuryBalance, "Input disburse amount exceeds remaining deposit in Treasury");
        
        uint256 defaultDisburseAmount = currentDefaultDisburseAmount();
        uint256 disburseAmount = (_reqAmount > 0) ? _reqAmount : defaultDisburseAmount;
        require(disburseAmount <= treasuryBalance, "Treasury remaining deposit is less than disburse amount");
        
        ERC20Upgradeable(PURSE).safeTransfer(PURSE_STAKING, disburseAmount);
        lastDisbursedAmount = disburseAmount;
        lastDisbursementTimestamp = block.timestamp;
        disburseHistoricTotal += disburseAmount;
        emit DisburseToPurseStaking(lastDisbursementTimestamp, disburseAmount);
    }

    function ownerDisburseToPurseStaking(uint256 _amount) external onlyOwnerRole {
        require(
            block.timestamp > lastDisbursementTimestamp + disburseInterval,
            "Disbursement interval not reached"
        );
        uint256 treasuryBalance = IERC20(PURSE).balanceOf(address(this));
        require(treasuryBalance > 0, "Insufficient deposit in Treasury");
        //require(_amount <= treasuryBalance, "Input disburse amount exceeds remaining deposit in Treasury");
        
        uint256 defaultDisburseAmount = currentDefaultDisburseAmount();
        uint256 disburseAmount = (_amount > 0) ? _amount : defaultDisburseAmount;
        require(disburseAmount <= treasuryBalance, "Treasury remaining deposit is less than disburse amount");
        
        ERC20Upgradeable(PURSE).safeTransfer(PURSE_STAKING, disburseAmount);
        lastDisbursedAmount = disburseAmount;
        lastDisbursementTimestamp = block.timestamp;
        disburseHistoricTotal += disburseAmount;
        emit DisburseToPurseStaking(lastDisbursementTimestamp, disburseAmount);
    }

    function returnToken(address _token, address _to, uint256 _amount) external onlyOwnerRole {
        require(_to != address(0), "Cannot be a zero address");
        require(_amount > 0, "Amount must be more than 0");
        ERC20Upgradeable(_token).safeTransfer(_to, _amount);
        emit ReturnToken(_to, _amount);
    }
}
