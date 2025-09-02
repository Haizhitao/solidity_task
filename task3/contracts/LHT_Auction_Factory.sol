// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "./LHT_Auction.sol";

/**
 * 拍卖工厂合约，使用类似Uniswap V2的工厂模式管理拍卖合约实例
 * 负责创建、管理和升级拍卖合约
 * 支持UUPS升级模式
 */
contract LHT_Auction_Factory is Initializable, UUPSUpgradeable, Ownable {
    
    // 拍卖合约实现地址
    address public auctionImplementation;
    
    // 所有创建的拍卖合约地址
    address[] public allAuctions;
    
    // 拍卖合约地址映射到创建者
    mapping(address => address) public auctionCreator;
    
    // 用户创建的拍卖合约列表
    mapping(address => address[]) public userAuctions;
    
    // 拍卖合约状态
    mapping(address => bool) public isAuctionContract;
    
    // 事件
    event AuctionCreated(address indexed auction, address indexed creator, uint256 timestamp);
    event ImplementationUpdated(address indexed oldImplementation, address indexed newImplementation);
    event AuctionUpgraded(address indexed auction, address indexed newImplementation);
    event FactoryInitialized(address indexed implementation, address indexed owner);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() Ownable(msg.sender) {
        _disableInitializers();
    }
    
    /**
     * 初始化函数
     * @param _auctionImplementation 拍卖合约实现地址
     * @param _owner 工厂合约所有者
     */
    function initialize(address _auctionImplementation, address _owner) public initializer {
        require(_auctionImplementation != address(0), "Invalid implementation address");
        require(_owner != address(0), "Invalid owner address");
        
        __UUPSUpgradeable_init();
        _transferOwnership(_owner);
        
        auctionImplementation = _auctionImplementation;
        
        emit FactoryInitialized(_auctionImplementation, _owner);
    }
    
    /**
     * 创建新的拍卖合约实例
     * @return auction 新创建的拍卖合约地址
     */
    function createAuction() external returns (address auction) {
        // 使用Clones库创建代理合约
        auction = Clones.clone(auctionImplementation);
        
        // 初始化拍卖合约
        LHT_Auction(auction).initialize();

        //设置工厂地址
        LHT_Auction(auction).setFactory(address(this));
        
        // 记录拍卖合约信息
        allAuctions.push(auction);
        auctionCreator[auction] = msg.sender;
        userAuctions[msg.sender].push(auction);
        isAuctionContract[auction] = true;
        
        emit AuctionCreated(auction, msg.sender, block.timestamp);
        
        return auction;
    }
    
    /**
     * 更新拍卖合约实现地址（仅所有者）
     * @param _newImplementation 新的实现地址
     */
    function updateImplementation(address _newImplementation) external onlyOwner {
        require(_newImplementation != address(0), "Invalid implementation address");
        address oldImplementation = auctionImplementation;
        auctionImplementation = _newImplementation;
        
        emit ImplementationUpdated(oldImplementation, _newImplementation);
    }
    
    /**
     * 升级指定的拍卖合约（仅所有者）
     * @param auction 要升级的拍卖合约地址
     * @param newImplementation 新的实现地址
     */
    function upgradeAuction(address auction, address newImplementation) external onlyOwner {
        require(isAuctionContract[auction], "Not a valid auction contract");
        require(newImplementation != address(0), "Invalid implementation address");
        
        // 调用拍卖合约的升级函数
        try LHT_Auction(auction).upgradeTo(newImplementation) {
            emit AuctionUpgraded(auction, newImplementation);
        } catch {
            revert("Upgrade failed");
        }
    }
    
    /**
     * 获取所有拍卖合约数量
     * @return 拍卖合约总数
     */
    function getAllAuctionsCount() external view returns (uint256) {
        return allAuctions.length;
    }
    
    /**
     * 获取用户创建的拍卖合约数量
     * @param user 用户地址
     * @return 用户创建的拍卖合约数量
     */
    function getUserAuctionsCount(address user) external view returns (uint256) {
        return userAuctions[user].length;
    }
    
    /**
     * 获取用户创建的拍卖合约列表
     * @param user 用户地址
     * @param start 起始索引
     * @param end 结束索引
     * @return 拍卖合约地址数组
     */
    function getUserAuctions(address user, uint256 start, uint256 end) external view returns (address[] memory) {
        uint256 userAuctionCount = userAuctions[user].length;
    
        if (userAuctionCount == 0) {
            return new address[](0);
        }
        
        require(start < userAuctionCount, "Start index out of bounds");
        require(start <= end && end < userAuctionCount, "Invalid range");
        
        uint256 length = end - start + 1;
        address[] memory auctions = new address[](length);
        
        for (uint256 i = 0; i < length; i++) {
            auctions[i] = userAuctions[user][start + i];
        }
        
        return auctions;
    }
    
    /**
     * 获取最近的拍卖合约
     * @param count 要获取的数量
     * @return 最近的拍卖合约地址数组
     */
    function getRecentAuctions(uint256 count) external view returns (address[] memory) {
        uint256 totalCount = allAuctions.length;
        uint256 returnCount = count > totalCount ? totalCount : count;
        
        address[] memory recentAuctions = new address[](returnCount);
        
        for (uint256 i = 0; i < returnCount; i++) {
            recentAuctions[i] = allAuctions[totalCount - returnCount + i];
        }
        
        return recentAuctions;
    }
    
    /**
     * 验证地址是否为有效的拍卖合约
     * @param auction 要验证的地址
     * @return 是否为有效的拍卖合约
     */
    function isValidAuction(address auction) external view returns (bool) {
        return isAuctionContract[auction];
    }
    
    /**
     * 获取拍卖合约的创建者
     * @param auction 拍卖合约地址
     * @return 创建者地址
     */
    function getAuctionCreator(address auction) external view returns (address) {
        return auctionCreator[auction];
    }
    
    /**
     * 获取工厂合约信息
     * @return implementation 当前实现地址
     * @return totalAuctions 总拍卖合约数量
     * @return owner 工厂合约所有者
     */
    function getFactoryInfo() external view returns (
        address implementation,
        uint256 totalAuctions,
        address owner
    ) {
        return (
            auctionImplementation,
            allAuctions.length,
            this.owner()
        );
    }
    
    //获取工厂合约版本信息
    function getFactoryVersion() external view virtual returns (
        string memory version,
        address implementation
    ) {
        return ("1.0", auctionImplementation);
    }
    
    /**
     * UUPS升级授权函数
     * 只有所有者可以升级工厂合约
     */
    function _authorizeUpgrade(address) internal view override onlyOwner {
        // 参数验证在调用时进行
    }
}