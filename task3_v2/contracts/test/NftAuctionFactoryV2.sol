// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../NftAuctionFactory.sol";

contract NftAuctionFactoryV2 is NftAuctionFactory {
    
    //获取工厂合约版本信息
    function getVersion() external override pure returns (
        string memory version
    ) {
        return "2.0";
    }
}
