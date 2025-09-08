// SPDX-License-Identifier: SimPL-2.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./NftAuction.sol";

contract NftAuctionFactory is OwnableUpgradeable, UUPSUpgradeable {
    event AuctionCreated(address indexed seller, address indexed auction, AuctionParameters params);

    address[] public auctions;
    mapping(address => bool) public isAuction;
    address public auctionBeacon;

    function initialize(address _auctionBeacon) public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        auctionBeacon = _auctionBeacon;
    }

    // UUPS升级授权函数，只有合约所有者能升级
    function _authorizeUpgrade(address) internal view override onlyOwner {}

    function createAuction(
        address _nftContract,
        uint256 _tokenId,
        address _paymentToken,
        uint256 _reservePrice,
        uint256 _bidIncrement,
        uint256 _auctionDuration,
        uint256 _startTime
    ) public {
        require(_auctionDuration > 0, "Auction duration must be greater than 0");
        require(_reservePrice > 0, "Reserve price must be greater than 0");
        require(_bidIncrement > 0, "Bid increment must be greater than 0");
        require(_startTime >= block.timestamp, "Start time must be in the future");
        require(_auctionDuration <= 30 days, "Auction duration too long");

        // 验证NFT所有权
        IERC721 nft = IERC721(_nftContract);
        require(nft.ownerOf(_tokenId) == msg.sender, "Not the owner of the NFT");
        
        // 验证NFT授权
        require(nft.isApprovedForAll(msg.sender, address(this)) || 
                nft.getApproved(_tokenId) == address(this), "NFT not approved for transfer");

        AuctionParameters memory params = AuctionParameters({
            nftContract: _nftContract,
            tokenId: _tokenId,
            paymentToken: _paymentToken,
            reservePrice: _reservePrice,
            bidIncrement: _bidIncrement,
            auctionDuration: _auctionDuration,
            startTime: _startTime,
            seller: msg.sender
        });

        bytes memory data = abi.encodeWithSelector(
            NftAuction.initialize.selector,
            address(this),
            params
        );
        
        BeaconProxy auction = new BeaconProxy(auctionBeacon, data);

        auctions.push(address(auction));
        isAuction[address(auction)] = true;
        emit AuctionCreated(msg.sender, address(auction), params);
    }

    function createAuctionWithETH(
        address _nftContract,
        uint256 _tokenId,
        uint256 _reservePrice,
        uint256 _bidIncrement,
        uint256 _auctionDuration,
        uint256 _startTime
    ) public {
        createAuction(
            _nftContract,
            _tokenId,
            address(0), // 使用ETH作为支付代币
            _reservePrice,
            _bidIncrement,
            _auctionDuration,
            _startTime
        );
    }

    function createAuctionWithERC20(
        address _nftContract,
        uint256 _tokenId,
        address _paymentToken,
        uint256 _reservePrice,
        uint256 _bidIncrement,
        uint256 _auctionDuration,
        uint256 _startTime
    ) public {
        require(_paymentToken != address(0), "Payment token cannot be zero address");
        createAuction(
            _nftContract,
            _tokenId,
            _paymentToken,
            _reservePrice,
            _bidIncrement,
            _auctionDuration,
            _startTime
        );
    }

    function getAuctions() external view returns (address[] memory) {
        return auctions;
    }

    function getAuctionCount() external view returns (uint256) {
        return auctions.length;
    }

    function isAuctionContract(address auctionAddr) external view returns (bool) {
        return isAuction[auctionAddr];
    }

    function getVersion() external pure virtual returns (
        string memory version
    ) {
        return "1.0";
    }

}
