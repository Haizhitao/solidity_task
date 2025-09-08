// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../NftAuction.sol";

contract NftAuctionV2 is NftAuction {
    
    //获取拍卖合约版本信息
    function getAuctionVersion() external override pure returns (
        string memory version
    ) {
        return "2.0";
    }
}
