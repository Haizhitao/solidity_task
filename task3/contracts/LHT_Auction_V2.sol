// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./LHT_Auction.sol";

contract LHT_Auction_V2 is LHT_Auction {
    
    //获取拍卖合约版本信息
    function getAuctionVersion() external pure override returns (
        string memory version
    ) {
        return "2.0";
    }

    //添加新功能：获取拍卖统计信息
    function getAuctionStats() external view returns (
        uint256 totalAuctions,
        uint256 activeAuctions,
        uint256 completedAuctions
    ) {
        totalAuctions = auctionId;
        uint256 active = 0;
        uint256 completed = 0;
        
        for (uint256 i = 0; i < auctionId; i++) {
            if (auctions[i].ended) {
                completed++;
            } else if (this.isAuctionActive(i)) {
                active++;
            }
        }
        return (totalAuctions, active, completed);
    }

}