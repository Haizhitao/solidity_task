// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./LHT_Auction_Factory.sol";

contract LHT_AuctionFactory_V2 is LHT_Auction_Factory{

    // 获取工厂合约版本信息
    function getFactoryVersion() external view override returns (
        string memory version,
        address implementation
    ) {
        return ("2.0", auctionImplementation);  // 修复版本号
    }
    
    // 添加新功能：获取工厂统计信息
    function getFactoryStats() external view returns (
        uint256 totalAuctions,
        uint256 totalCreators,
        address implementation
    ) {
        totalAuctions = allAuctions.length;
        
        // 计算不同创建者数量
        address[] memory creators = new address[](totalAuctions);
        uint256 uniqueCreators = 0;
        
        for (uint256 i = 0; i < totalAuctions; i++) {
            address creator = auctionCreator[allAuctions[i]];
            bool found = false;
            
            for (uint256 j = 0; j < uniqueCreators; j++) {
                if (creators[j] == creator) {
                    found = true;
                    break;
                }
            }
            
            if (!found) {
                creators[uniqueCreators] = creator;
                uniqueCreators++;
            }
        }
        
        return (totalAuctions, uniqueCreators, auctionImplementation);
    }

}