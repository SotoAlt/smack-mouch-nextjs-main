// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MouchDrops {
	address public owner;
	address public admin;
	uint256 public cooldownPeriod = 10 minutes;
	uint256 public maxDisbursement = 30 ether;
	mapping(address => uint256) public lastRequestTime;

	event EtherReceived(address indexed sender, uint256 amount);
	event OwnerWithdraw(address indexed owner, uint256 amount);

	constructor(address _admin) {
		owner = msg.sender;
		admin = _admin;
	}

	modifier onlyOwner() {
		require(msg.sender == owner, "Caller is not the owner");
		_;
	}

	modifier onlyAdmin() {
		require(msg.sender == admin, "Not authorized!");
		_;
	}

	receive() external payable {
		emit EtherReceived(msg.sender, msg.value);
	}

	function updateAdmin(address _newAdmin) external onlyOwner {
		admin = _newAdmin;
	}

	function disburse(
		address payable recipient,
		uint256 amount
	) external onlyAdmin {
		require(recipient != address(0), "Invalid recipient");
		require(amount > 0 && amount <= maxDisbursement, "Invalid amount");
		require(
			address(this).balance >= amount,
			"Insufficient contract balance"
		);
		require(
			block.timestamp >= lastRequestTime[recipient] + cooldownPeriod,
			"Cooldown period not yet expired"
		);
		lastRequestTime[recipient] = block.timestamp;

		// ✅ Send Ether to the recipient
		(bool sent, ) = recipient.call{ value: amount }("");
		require(sent, "Failed to disburse rewards");
	}

	function setCooldownPeriod(uint256 newCooldownPeriod) external onlyOwner {
		cooldownPeriod = newCooldownPeriod;
	}

	function setMaxDisbursement(uint256 newMaxDisbursement) external onlyOwner {
		require(
			newMaxDisbursement > 0,
			"Max disbursement must be greater than zero"
		);
		maxDisbursement = newMaxDisbursement;
	}

	function withdrawAll() external onlyOwner {
		uint256 contractBalance = address(this).balance;
		require(contractBalance > 0, "No funds to withdraw");

		(bool sent, ) = owner.call{ value: contractBalance }("");
		require(sent, "Failed to withdraw funds");

		emit OwnerWithdraw(owner, contractBalance);
	}

	function transferOwnership(address newOwner) external onlyOwner {
		require(newOwner != address(0), "New owner cannot be zero address");
		owner = newOwner;
	}
}
