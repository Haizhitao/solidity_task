// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

struct AuctionParameters {
    address nftContract;          // NFT合约地址
    uint256 tokenId;              // NFT Token ID
    address paymentToken;         // 支付代币地址 (address(0) 表示ETH)
    uint256 reservePrice;         // 开始价格
    uint256 bidIncrement;         // 最小加价幅度
    uint256 auctionDuration;      // 拍卖持续时间
    uint256 startTime;            // 拍卖开始时间
    address seller;               // 卖家地址
}

interface INftAuction {
    function vaultAccount() external view returns (address);
    function getAuctionInfo() external view returns (AuctionParameters memory);
}
