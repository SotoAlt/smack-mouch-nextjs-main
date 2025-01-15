// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract YourContract {
	address public owner;
	mapping(address => uint256) public lastRequestTime;

	uint256 public dripAmount = 10 * 10 ** 16; // 100 tokens with 18 decimals
	uint256 public cooldownPeriod = 24 hours;

	event TokensRequested(address indexed requester, uint256 amount);

	modifier onlyOwner() {
		require(msg.sender == owner, "Not owner");
		_;
	}

	// Prevent reentrancy
	bool private locked;
	modifier noReentrant() {
		require(!locked, "No re-entrancy");
		locked = true;
		_;
		locked = false;
	}

	constructor(address _owner) {
		owner = _owner;
	}

	receive() external payable {}

	function requestTokens() external noReentrant {
		require(
			block.timestamp >= lastRequestTime[msg.sender] + cooldownPeriod,
			"Please wait for cooldown"
		);

		require(address(this).balance >= dripAmount, "Faucet empty");

		lastRequestTime[msg.sender] = block.timestamp;

		(bool sent, ) = msg.sender.call{ value: dripAmount }("");
		require(sent, "Failed to send tokens");

		emit TokensRequested(msg.sender, dripAmount);
	}

	function setDripAmount(uint256 newAmount) external onlyOwner {
		require(newAmount > 0, "Invalid amount");
		dripAmount = newAmount;
	}

	function setCooldown(uint256 newPeriod) external onlyOwner {
		cooldownPeriod = newPeriod;
	}

	function withdraw() external onlyOwner {
		(bool sent, ) = owner.call{ value: address(this).balance }("");
		require(sent, "Failed to withdraw");
	}
}
