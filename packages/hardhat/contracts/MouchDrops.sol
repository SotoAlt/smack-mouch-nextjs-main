// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MouchDrops {
	address public owner;
	uint256 public cooldownPeriod = 10 minutes;
	uint256 public maxDisbursement = 30 ether;
	mapping(address => uint256) public lastRequestTime; // Track last request time per address

	event EtherReceived(address indexed sender, uint256 amount);
	event EtherDisbursed(address indexed recipient, uint256 amount);
	event CooldownPeriodUpdated(uint256 newCooldownPeriod);
	event MaxDisbursementUpdated(uint256 newMaxDisbursement);
	event OwnerWithdraw(address indexed owner, uint256 amount);

	modifier onlyOwner() {
		require(msg.sender == owner, "Caller is not the owner");
		_;
	}

	constructor() {
		owner = msg.sender;
	}

	receive() external payable {
		emit EtherReceived(msg.sender, msg.value);
	}

	function disburse(address payable recipient, uint256 amount) external {
		require(recipient != address(0), "Invalid recipient address");
		require(amount > 0 && amount <= maxDisbursement, "Invalid amount");
		require(
			address(this).balance >= amount,
			"Insufficient contract balance"
		);
		require(
			block.timestamp >= lastRequestTime[msg.sender] + cooldownPeriod,
			"Cooldown period not yet expired"
		);

		// Update the last request time for the sender
		lastRequestTime[msg.sender] = block.timestamp;

		// Send Ether to the recipient
		(bool sent, ) = recipient.call{ value: amount }("");
		require(sent, "Failed to disburse DMON");

		emit EtherDisbursed(recipient, amount);
	}

	function setCooldownPeriod(uint256 newCooldownPeriod) external onlyOwner {
		cooldownPeriod = newCooldownPeriod;
		emit CooldownPeriodUpdated(newCooldownPeriod);
	}

	function setMaxDisbursement(uint256 newMaxDisbursement) external onlyOwner {
		require(
			newMaxDisbursement > 0,
			"Max disbursement must be greater than zero"
		);
		maxDisbursement = newMaxDisbursement;
		emit MaxDisbursementUpdated(newMaxDisbursement);
	}

	function withdrawAll() external onlyOwner {
		uint256 contractBalance = address(this).balance;
		require(contractBalance > 0, "No DMON to withdraw");

		(bool sent, ) = owner.call{ value: contractBalance }("");
		require(sent, "Failed to withdraw DMON");

		emit OwnerWithdraw(owner, contractBalance);
	}

	function transferOwnership(address newOwner) external onlyOwner {
		require(newOwner != address(0), "New owner cannot be zero address");
		owner = newOwner;
	}
}
