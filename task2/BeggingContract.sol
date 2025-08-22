// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract BeggingContract is Ownable {
    uint256 public constant PRICE = 0.01 ether;
    uint256 public totalBegged;
    mapping(address => uint256) public beggedAmounts;
    address[] public allDonors;

    constructor() Ownable(msg.sender) {}

    event Donate(address indexed sender, uint256 amount, uint256 timestamp);
    event Withdraw(address indexed owner, uint256 amount, uint256 timestamp);

    function donate() external payable {
        require(msg.value >= PRICE, "You must donate at least 1 ETH to beg.");
        totalBegged += msg.value;
        beggedAmounts[msg.sender] += msg.value;
        allDonors.push(msg.sender);
        emit Donate(msg.sender, msg.value, block.timestamp);
    }

    receive() external payable { }
    fallback() external payable { }

    function withdraw() external onlyOwner {
        payable(msg.sender).transfer(address(this).balance);
        emit Withdraw(msg.sender, address(this).balance, block.timestamp);
    }

    function getDonation(address sender) external view returns(uint256) {
        return beggedAmounts[sender];
    }

    function getTopDonors() external view returns (address[3] memory topAddresses, uint256[3] memory topAmounts) {
        // address[3] memory topAddresses;
        // uint256[3] memory topAmounts = [uint256(0), uint256(0), uint256(0)];

        for (uint256 i = 0; i < allDonors.length; i++) {
            address donor = allDonors[i];
            uint256 amount = beggedAmounts[donor];

            if (amount > topAmounts[0]) {
                topAmounts[2] = topAmounts[1];
                topAddresses[2] = topAddresses[1];
                topAmounts[1] = topAmounts[0];
                topAddresses[1] = topAddresses[0];
                topAmounts[0] = amount;
                topAddresses[0] = donor;
            } else if (amount > topAmounts[1]) {
                topAmounts[2] = topAmounts[1];
                topAddresses[2] = topAddresses[1];
                topAmounts[1] = amount;
                topAddresses[1] = donor;
            } else if (amount > topAmounts[2]) {
                topAmounts[2] = amount;
                topAddresses[2] = donor;
            }
        }
        return (topAddresses, topAmounts);
    }


}