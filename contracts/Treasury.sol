// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Governable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract Treasury is Initializable, UUPSUpgradeable, Governable {
    using SafeERC20 for IERC20;

    address public constant PURSE = 0x29a63F4B209C29B4DC47f06FFA896F32667DAD2C;
    address public PURSE_STAKING;
    uint256 public disburseHistoricTotal;
    uint256 public lastUpdatedTimestamp;
    uint256 public lastUpdatedTreasuryBalance;
    uint256 public lastDisbursementTimestamp;
    uint256 public disburseInterval;
    uint256 public range;
    uint256 internal defaultDisbursePerInterval;

    event UpdateDisburseInterval(uint256 indexed _days);
    event UpdatePurseTreasury(address indexed _sender, uint256 indexed _time, uint256 indexed _amount);
    event DisburseToPurseStaking(uint256 indexed _time, uint256 indexed _amount);
    event ReturnToken(address indexed _recipient, uint256 indexed _amount);

    function initialize(address _owner, address _governor) public initializer {
        __Governable_init(_owner, _governor);
        PURSE_STAKING = 0xFb1D31a3f51Fb9422c187492D8EA14921d6ea6aE;
        disburseInterval = 30 days;
        range = 12;

        __UUPSUpgradeable_init();
    }

    /**************************************** ONLY GOVERNOR_ROLE FUNCTIONS ****************************************/
    //Governor only
    function updatePurseTreasury(bool _updateLastDisbursementTimestamp) external onlyRole(GOVERNOR_ROLE) {
        lastUpdatedTreasuryBalance = IERC20(PURSE).balanceOf(address(this));
        lastUpdatedTimestamp = block.timestamp;
        defaultDisbursePerInterval = lastUpdatedTreasuryBalance / range;

        if(_updateLastDisbursementTimestamp == true) {
            lastDisbursementTimestamp = block.timestamp;
        }
        
        emit UpdatePurseTreasury(msg.sender, block.timestamp, lastUpdatedTreasuryBalance);
    }

    /**************************************** ONLY OPERATOR_ROLE FUNCTIONS ****************************************/
    //Any address assigned OPERATOR_ROLE
    function disburseToPurseStaking() external onlyRole(OPERATOR_ROLE) {
        require(
            block.timestamp > lastDisbursementTimestamp + disburseInterval,
            "Disbursement interval not reached"
        );
        uint256 treasuryBal = IERC20(PURSE).balanceOf(address(this));
        
        uint256 disburseAmount = defaultDisbursePerInterval;
        require(disburseAmount > 0, "Amount must be more than 0");
        require(disburseAmount <= treasuryBal, "Treasury remaining deposit is less than disburse amount");

        IERC20(PURSE).safeTransfer(PURSE_STAKING, disburseAmount);
        lastDisbursementTimestamp = block.timestamp;
        disburseHistoricTotal += disburseAmount;

        emit DisburseToPurseStaking(lastDisbursementTimestamp, disburseAmount);
    }


    /**************************************** ONLY OWNER FUNCTIONS ****************************************/

    function ownerDisburseToPurseStaking(uint256 _amount) external onlyRole(OWNER_ROLE) {
        require(
            block.timestamp > lastDisbursementTimestamp + disburseInterval,
            "Disbursement interval not reached"
        );
        uint256 treasuryBal = IERC20(PURSE).balanceOf(address(this));
        
        uint256 disburseAmount = (_amount > 0) ? _amount : defaultDisbursePerInterval;
        require(disburseAmount > 0, "Amount must be more than 0");
        require(disburseAmount <= treasuryBal, "Treasury remaining deposit is less than disburse amount");
        
        IERC20(PURSE).safeTransfer(PURSE_STAKING, disburseAmount);
        lastDisbursementTimestamp = block.timestamp;
        disburseHistoricTotal += disburseAmount;

        emit DisburseToPurseStaking(lastDisbursementTimestamp, disburseAmount);
    }    
    
    function _authorizeUpgrade(address newImplementation) internal onlyRole(OWNER_ROLE) override {}

    function updateDisburseRange(uint256 _months) external onlyRole(OWNER_ROLE) {
        require(_months != 0, "Disburse range cannot be 0");
        range = _months;
    }

    function updateStakingAddress(address _addr) external onlyRole(OWNER_ROLE) {
        require(_addr != address(0), "Cannot be a zero address");
        PURSE_STAKING = _addr;
    }

    function updateDisburseInterval(uint256 _days) external onlyRole(OWNER_ROLE) {
        require(_days > 0, "Days must be more than 0");
        disburseInterval = _days;
        emit UpdateDisburseInterval(_days);
    }

    function returnToken(address _token, address _to, uint256 _amount) external onlyRole(OWNER_ROLE) {
        require(_to != address(0), "Cannot be a zero address");
        require(_amount > 0, "Amount must be more than 0");
        IERC20(_token).safeTransfer(_to, _amount);
        emit ReturnToken(_to, _amount);
    }

    /**************************************** VIEW FUNCTIONS ****************************************/
    
    function currentDisburseAmount() external view returns (uint256) {
        return defaultDisbursePerInterval;
    }

    function depositHistoricTotal() external view returns (uint256) {
        return disburseHistoricTotal + IERC20(PURSE).balanceOf(address(this));
    }

    function TreasuryBalance() external view returns (uint256) {
        return IERC20(PURSE).balanceOf(address(this));
    }
}
