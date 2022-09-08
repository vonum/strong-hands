// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IWETHGateway.sol";
import "./interfaces/IAToken.sol";

contract StrongHands is Ownable {
    uint256 public constant BASIS_POINT = 100;

    uint256 public immutable timeframe;
    IWETHGateway public immutable gateway;
    IAToken public immutable aWETH;
    address public immutable lendingPoolAddress;

    uint256 public totalDeposit;
    uint256 public penalties;
    uint256 public totalDepositors; // not needed?

    mapping(address => uint256) public deposits;
    mapping(address => uint256) public lockPeriods;
    address[] public depositors;

    event Deposited(address sender, uint256 value, uint256 lockedUntil);
    event Withdrew(address sender, uint256 value, uint256 penalty);

    constructor(
        uint256 _timeframe,
        IWETHGateway _gateway,
        IAToken _aWETH,
        address _lendingPoolAddress)
    {
        timeframe = _timeframe;
        gateway = _gateway;
        aWETH = _aWETH;
        lendingPoolAddress = _lendingPoolAddress;
    }

    receive() external payable {}

    function deposit() public payable {
        require(msg.value > 0, "Deposited 0 ethers");

        if (deposits[msg.sender] == 0) {
            totalDepositors++;
            depositors.push(msg.sender);
        }

        gateway.depositETH{value: msg.value}(lendingPoolAddress, address(this), 0);

        totalDeposit += msg.value;
        deposits[msg.sender] += msg.value;
        lockPeriods[msg.sender] = block.timestamp;

        emit Deposited(msg.sender, msg.value, block.timestamp + timeframe);
    }

    function withdraw() public returns(bool) {
        require(deposits[msg.sender] > 0, "No deposit");

        uint256 userDeposit = deposits[msg.sender];

        uint256 penalty;
        uint256 userReturn;

        if (block.timestamp > lockPeriods[msg.sender] + timeframe) {
            uint256 portionOfPenalty = _portionOfPenalty(deposits[msg.sender], penalties);
            penalties -= portionOfPenalty;

            userReturn = userDeposit + portionOfPenalty;
        } else {
            penalty = _penalty(userDeposit, lockPeriods[msg.sender]);
            penalties += penalty;
            userReturn = userDeposit - penalty;
        }

        aWETH.approve(address(gateway), userReturn);
        gateway.withdrawETH(lendingPoolAddress, userReturn, address(this));

        totalDepositors--;
        deposits[msg.sender] = 0;
        totalDeposit -= userDeposit;

        payable(msg.sender).transfer(userReturn);
        emit Withdrew(msg.sender, userReturn, penalty);

        return true;
    }

    function redeem() public onlyOwner returns (bool) {
        uint256 balance = aWETH.balanceOf(address(this));
        uint256 reward = balance - totalDeposit;
        require(reward > 0, "No reward tokens to redeem");

        aWETH.redeem(reward);
        aWETH.transfer(msg.sender, reward);

        return true;
    }

    function _portionOfPenalty(uint256 value, uint256 penalty) private view returns (uint256) {
        uint256 p = value * BASIS_POINT / totalDeposit;
        return penalty * p / BASIS_POINT;
    }

    function _penalty(uint256 value, uint256 startTimestamp) private view returns (uint256) {
        uint256 percent = _penaltyPercent(startTimestamp);
        return (value * percent) / BASIS_POINT;
    }

    function _penaltyPercent(uint256 startTimestamp) private view returns (uint256) {
        // Divide by 2 because the penalty starts at 50%
        return (100 - ((block.timestamp - startTimestamp) * BASIS_POINT) / timeframe) / 2;
    }
}
