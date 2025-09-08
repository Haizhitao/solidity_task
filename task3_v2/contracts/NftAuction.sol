// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "./interface/INftAuction.sol";

//NFT拍卖合约
contract NftAuction is INftAuction, OwnableUpgradeable {

    enum AuctionStatus {
        Pending,    // 待开始
        Active,     // 进行中
        Ended      // 已结束
    }

    struct Bid {
        address bidder;      // 出价者
        uint256 amount;      // 出价金额
        uint256 timestamp;   // 出价时间
    }

    address private factory;
    AuctionParameters private params;
    AuctionStatus private auctionStatus;
    uint256 private endTime;
    bool internal locked;

    // 出价相关状态变量
    address public currentHighestBidder;
    uint256 public currentHighestBid;
    uint256 public totalBids;
    mapping(address => Bid[]) public bidHistory;
    address[] public bidders;

    // Chainlink 价格预言机
    mapping(address => AggregatorV3Interface) public priceFeeds;
    address public constant ETH_ADDRESS = address(0);

    //防止重入攻击
    modifier noReentrant() {
        require(!locked, "No re-entrancy");
        locked = true;
        _;
        locked = false;
    }

    // 事件定义
    event AuctionCreated(address indexed seller, address indexed nftContract, uint256 indexed tokenId, AuctionParameters params);
    event BidPlaced(address indexed bidder, uint256 amount, uint256 totalBids);
    event BidRefunded(address indexed bidder, uint256 amount);
    event AuctionEnded(address indexed winner, uint256 winningBid);
    event BidInUSD(address indexed bidder, uint256 amount, uint256 usdAmount, address tokenAddress);

    function initialize(address _factory, AuctionParameters memory _params) public initializer {
        __Ownable_init(_params.seller);
        factory = _factory;
        params = _params;
        auctionStatus = AuctionStatus.Pending;
        endTime = 0;

        // 初始化出价状态
        currentHighestBidder = address(0);
        currentHighestBid = 0;
        totalBids = 0;

        emit AuctionCreated(_params.seller, _params.nftContract, _params.tokenId, _params);
    }

    function startAuction() public onlyOwner {
        require(auctionStatus == AuctionStatus.Pending, "Auction not in pending status");
        require(block.timestamp >= params.startTime, "Auction start time not reached");
        
        // 转移NFT到合约
        IERC721 nft = IERC721(params.nftContract);
        nft.safeTransferFrom(params.seller, address(this), params.tokenId);
        
        auctionStatus = AuctionStatus.Active;
        endTime = block.timestamp + params.auctionDuration;
    }

    // ETH出价函数
    function placeBid() public payable noReentrant {
        require(auctionStatus == AuctionStatus.Active, "Auction is not active");
        require(block.timestamp < endTime, "Auction has ended");
        require(params.paymentToken == address(0), "This auction only accepts native tokens");
        require(msg.value > 0, "ETH bid amount must be greater than 0");
        
        _processBid(msg.value, ETH_ADDRESS);
    }

    // ERC20代币出价函数
    function placeBidWithERC20(uint256 bidAmount) public noReentrant {
        require(auctionStatus == AuctionStatus.Active, "Auction is not active");
        require(block.timestamp < endTime, "Auction has ended");
        require(params.paymentToken != address(0), "This auction only accepts ERC20 tokens");
        require(bidAmount > 0, "Token bid amount must be greater than 0");
        
        // 转移代币到合约
        IERC20 paymentToken = IERC20(params.paymentToken);
        require(paymentToken.transferFrom(msg.sender, address(this), bidAmount), "Token transfer failed");
        
        _processBid(bidAmount, params.paymentToken);
    }

    // 内部函数：处理出价逻辑
    function _processBid(uint256 bidAmount, address tokenAddress) internal {
        require(bidAmount >= params.reservePrice, "Bid below reserve price");
        require(bidAmount >= currentHighestBid + params.bidIncrement, "Bid increment too small");

        // 获取代币的USD价值
        uint256 usdAmount = getTokenValueInUSD(bidAmount, tokenAddress);

        // 退还前一个最高出价者的资金
        if (currentHighestBid > 0) {
            _refundBidder(currentHighestBidder, currentHighestBid);
        }

        // 记录新出价
        Bid memory newBid = Bid({
            bidder: msg.sender,
            amount: bidAmount,
            timestamp: block.timestamp
        });

        bidHistory[msg.sender].push(newBid);
        totalBids++;

        // 如果是新的出价者，添加到列表中
        if (bidHistory[msg.sender].length == 1) {
            bidders.push(msg.sender);
        }

        // 更新最高出价
        currentHighestBidder = msg.sender;
        currentHighestBid = bidAmount;
        
        emit BidPlaced(msg.sender, bidAmount, totalBids);
        emit BidInUSD(msg.sender, bidAmount, usdAmount, tokenAddress);
    }

    // 内部函数
    function _refundBidder(address bidder, uint256 amount) internal {
        if (amount > 0) {
            if (params.paymentToken == address(0)) {
                // ETH退款
                (bool success,) = payable(bidder).call{value: amount}("");
                require(success, "ETH refund failed");
            } else {
                // ERC20代币退款
                IERC20 paymentToken = IERC20(params.paymentToken);
                bool success = paymentToken.transfer(bidder, amount);
                require(success, "Token refund failed");
            }
            emit BidRefunded(bidder, amount);
        }
    }

    // 获取代币的 USD 价值
    function getTokenValueInUSD(uint256 amount, address tokenAddress) public view returns (uint256) {
        AggregatorV3Interface priceFeed = priceFeeds[tokenAddress];
        require(address(priceFeed) != address(0), "Price feed not set");
        
        (
            /* uint80 roundId */,
            int256 answer,
            /*uint256 startedAt*/,
            /*uint256 updatedAt*/,
            /*uint80 answeredInRound*/
        ) = priceFeed.latestRoundData();
        
        require(answer > 0, "Invalid price feed answer");
        
        // 计算 USD 价值：amount * price / 10^decimals
        uint256 decimals = priceFeed.decimals();
        return (amount * uint256(answer)) / (10 ** decimals);
    }

    // 价格预言机管理函数
    function setPriceFeed(address tokenAddress, address priceFeedAddress) public onlyOwner {
        priceFeeds[tokenAddress] = AggregatorV3Interface(priceFeedAddress);
    }

    function getCurrentBidInUSD() public view returns (uint256) {
        if (currentHighestBid == 0) return 0;
        return getTokenValueInUSD(currentHighestBid, params.paymentToken);
    }

    function endAuction() public {
        require(auctionStatus == AuctionStatus.Active, "Auction is not active");
        require(block.timestamp >= endTime, "Auction has not ended yet");
        
        auctionStatus = AuctionStatus.Ended;
        
        if (currentHighestBidder != address(0)) {
            emit AuctionEnded(currentHighestBidder, currentHighestBid);
        }
    }

    // 视图函数
    function vaultAccount() public view override returns (address) {
        return address(this);
    }

    function getAuctionInfo() public view override returns (AuctionParameters memory) {
        return params;
    }
    
    //根据 ERC721 协议规范，当一个合约要接收 NFT 时，接收方合约必须实现 onERC721Received 函数 
    //这是 "安全转账" 的核心校验逻辑，目的是避免 NFT 误转入不支持接收的合约导致资产永久锁定。
    event NFTReceived(address operator, address from, uint256 tokenId, bytes data);
    function onERC721Received(
        address operator,     // 谁发起的转账
        address from,         // NFT来自哪里
        uint256 tokenId,      // 哪个NFT
        bytes calldata data   // 附加数据
    ) external returns (bytes4) {
        // 这里可以添加你的处理逻辑
        emit NFTReceived(operator, from, tokenId, data);
        // 必须返回这个魔法值！
        return this.onERC721Received.selector;
    }

    //获取拍卖合约版本信息
    function getAuctionVersion() external pure virtual returns (
        string memory version
    ) {
        return "1.0";
    }
}

contract NftAuctionBeacon is UpgradeableBeacon {
    constructor(address _implementation) UpgradeableBeacon(_implementation, msg.sender) {}

    function implementation() public view override returns (address) {
        return super.implementation();
    }

    function upgradeTo(address newImplementation) public override onlyOwner {
        super.upgradeTo(newImplementation);
    }
}
