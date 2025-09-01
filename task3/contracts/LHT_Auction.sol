// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

//NFT拍卖合约
contract LHT_Auction is Initializable, UUPSUpgradeable {

    struct Auction {
        address nftContract; //NFT合约地址
        uint256 nftTokenId; //NFT ID
        address seller; //拍卖者
        uint256 startTime; //拍卖开始时间
        uint256 duration; //拍卖时长
        uint256 startPrice; //拍卖开始价格
        address highestBidder; //最高出价者
        uint256 highestBid; //最高出价
        bool ended; //拍卖是否结束
        //代币类型：address(0)表示eth, 其他表示ERC20
        address tokenAddress;
    }

    mapping(uint256 => Auction) public auctions;
    uint256 public auctionId;
    address public admin; //管理员
    address public factory; //工厂合约地址
    bool public paused; //暂停状态

    // AggregatorV3Interface internal priceETHFeed;
    mapping(address => AggregatorV3Interface) public priceFeeds;

    // 事件
    event AuctionCreated(uint256 indexed auctionId, address indexed nftContract, uint256 tokenId, address indexed seller);
    event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount, address tokenAddress);
    event AuctionEnded(uint256 indexed auctionId, address indexed winner, uint256 amount);
    event PriceFeedUpdated(address indexed tokenAddress, address indexed priceFeed);

    // 修饰符
    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }

    modifier onlyFactory() {
        require(msg.sender == factory, "Only factory can call this function");
        _;
    }

    function initialize() public initializer { 
        require(admin == address(0), "Already initialized");
        admin = msg.sender;
        factory = msg.sender; // 初始化时工厂地址为部署者
    }

    /**
     * 设置工厂地址（仅工厂合约可调用）
     */
    function setFactory(address _factory) external onlyFactory {
        require(_factory != address(0), "Invalid factory address");
        factory = _factory;
    }

    //设置价格预言机
    function setPriceFeed(address tokenAddress, address priceFeed) external onlyAdmin {
        require(priceFeed != address(0), "Invalid price feed address");
        priceFeeds[tokenAddress] = AggregatorV3Interface(priceFeed);
        emit PriceFeedUpdated(tokenAddress, priceFeed);
    }

    //暂停合约
    function pause() external onlyAdmin {
        paused = true;
    }

    //恢复合约
    function unpause() external onlyAdmin {
        paused = false;
    }

    //创建拍卖
    function createAuction(address _nftContract, uint256 _tokenId, uint256 _duration, uint256 _startPrice, address _tokenAddress) public whenNotPaused {
        require(msg.sender == admin, "only admin can create auction");
        require(_startPrice > 0, "startPrice should grater than 0");
        require(_duration > 0, "duration must be greater than 0");
        require(_nftContract != address(0), "Invalid NFT contract address");
        
        //转移NFT到合约
        IERC721(_nftContract).safeTransferFrom(msg.sender, address(this), _tokenId);
        
        //创建拍卖
        auctions[auctionId] = Auction({
            nftContract: _nftContract,
            nftTokenId: _tokenId,
            seller: admin,
            startTime: block.timestamp,
            duration: _duration,
            startPrice: _startPrice,
            highestBidder: address(0),
            highestBid: 0,
            ended: false,
            tokenAddress: _tokenAddress
        });
        
        emit AuctionCreated(auctionId, _nftContract, _tokenId, admin);
        auctionId++;
    }

    //买家买入NFT
    function placeBid(uint256 _auctionId, uint256 _amount, address _tokenAddress) external payable whenNotPaused {
        Auction storage auction = auctions[_auctionId];
        require(_auctionId < auctionId, "Invalid auciton ID");
        require(!auction.ended && auction.startTime + auction.duration > block.timestamp, "auction has ended!");
        require(_amount > 0, "Bid amount must be greater than 0");
        
        // 验证代币类型一致性
        require(_tokenAddress == auction.tokenAddress, "Token type mismatch");
        uint256 actualAmount = _amount;

        if (_tokenAddress != address(0)) { //处理ERC20
            //ERC20 拍卖
            require(msg.value == 0, "ETH not accepted for ERC20 auction");
        } else { //处理ETH
            require(msg.value == _amount, "ETH amount mismatch");
            actualAmount = msg.value;
        }
        
        // 使用预言机获取标准化价格进行比较
        uint256 bidValueInUSD = getTokenValueInUSD(actualAmount, _tokenAddress);
        uint256 startPriceValueInUSD = getTokenValueInUSD(auction.startPrice, auction.tokenAddress);
        uint256 highestBidValueInUSD = getTokenValueInUSD(auction.highestBid, auction.tokenAddress);
        
        require(bidValueInUSD >= startPriceValueInUSD, "Bid must be at least start price");
        require(bidValueInUSD > highestBidValueInUSD, "Bid must be higher than current highest bid");
    
        
        //转移ERC20代币到合约
        if (_tokenAddress != address(0)) {
            IERC20(_tokenAddress).transferFrom(msg.sender, address(this), actualAmount);
        }
        
        //退还之前最高价
        if (auction.highestBid > 0) {
            if (auction.tokenAddress != address(0)) {
                IERC20(auction.tokenAddress).transfer(auction.highestBidder, auction.highestBid);
            } else {
                payable(auction.highestBidder).transfer(auction.highestBid);
            }
        }
        
        //设置当前最高价
        auction.highestBid = actualAmount;
        auction.highestBidder = msg.sender;
        
        emit BidPlaced(_auctionId, msg.sender, _amount, _tokenAddress);
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

    //结束拍卖
    function endAuction(uint256 _auctionID) external whenNotPaused {
        Auction storage auction = auctions[_auctionID];
        // 判断当前拍卖是否结束
        require(
            !auction.ended && (auction.startTime + auction.duration) <= block.timestamp,
            "Auction has not ended"
        );
        
        auction.ended = true;
        
        // 如果有出价者，转移NFT
        if (auction.highestBidder != address(0)) {
            IERC721(auction.nftContract).safeTransferFrom(
                address(this),
                auction.highestBidder,
                auction.nftTokenId
            );
            
            // 转移资金给卖家
            if (auction.tokenAddress != address(0)) {
                IERC20(auction.tokenAddress).transfer(auction.seller, auction.highestBid);
            } else {
                payable(auction.seller).transfer(auction.highestBid);
            }
            
            emit AuctionEnded(_auctionID, auction.highestBidder, auction.highestBid);
        }
    }

    /**
     * 紧急结束拍卖（仅管理员）
     */
    function emergencyEndAuction(uint256 _auctionID) external onlyAdmin {
        Auction storage auction = auctions[_auctionID];
        require(!auction.ended, "Auction already ended");
        
        auction.ended = true;
        
        // 退还NFT给卖家
        IERC721(auction.nftContract).safeTransferFrom(
            address(this),
            auction.seller,
            auction.nftTokenId
        );
        
        // 如果有出价者，退还资金
        if (auction.highestBidder != address(0)) {
            if (auction.tokenAddress != address(0)) {
                IERC20(auction.tokenAddress).transfer(auction.highestBidder, auction.highestBid);
            } else {
                payable(auction.highestBidder).transfer(auction.highestBid);
            }
        }
        
        emit AuctionEnded(_auctionID, auction.highestBidder, auction.highestBid);
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

    //UUPS代理必须实现
    function _authorizeUpgrade(address) internal view override {
        // 只有管理员可以升级合约
        require(msg.sender == admin, "Only admin can upgrade");
    }

    //获取拍卖信息
    function getAuctionInfo(uint256 _auctionId) external view returns (
        address nftContract,
        uint256 nftTokenId,
        address seller,
        uint256 startTime,
        uint256 duration,
        uint256 startPrice,
        address highestBidder,
        uint256 highestBid,
        bool ended,
        address tokenAddress
    ) {
        Auction storage auction = auctions[_auctionId];
        return (
            auction.nftContract,
            auction.nftTokenId,
            auction.seller,
            auction.startTime,
            auction.duration,
            auction.startPrice,
            auction.highestBidder,
            auction.highestBid,
            auction.ended,
            auction.tokenAddress
        );
    }

    // 检查拍卖是否活跃
    function isAuctionActive(uint256 _auctionId) external view returns (bool) {
        Auction storage auction = auctions[_auctionId];
        return !auction.ended && (auction.startTime + auction.duration) > block.timestamp;
    }

    //获取拍卖合约版本信息
    function getAuctionVersion() external pure returns (
        string memory version
    ) {
        return "1.0";
    }
}