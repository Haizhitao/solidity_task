# LHT Auction 系统部署指南

## 📋 概述

本指南将帮助您部署 LHT Auction 系统到本地网络和 Sepolia 测试网。

## 🛠️ 环境准备

### 1. 安装依赖

```bash
npm install
```

### 2. 环境变量配置

创建 `.env` 文件并配置以下变量：

```env
# 部署账户私钥
PRIVATE_KEY=your_private_key_here

# Sepolia RPC URL
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_project_id

# Etherscan API Key (用于合约验证)
ETHERSCAN_API_KEY=your_etherscan_api_key

# Gas 报告
REPORT_GAS=true
```

### 3. 编译合约

```bash
npm run compile
```

## 🚀 部署步骤

### 本地部署

1. **启动本地节点**
```bash
npm run node
```

2. **新开终端，部署到本地网络**
```bash
npm run deploy:local
```

### Sepolia 测试网部署

1. **部署到 Sepolia**
```bash
npm run deploy:sepolia
```

2. **验证合约（可选）**
```bash
npm run verify:sepolia
```

## 📁 部署脚本说明

### 部署顺序

1. **01_deploy_LHT_NFT.js** - 部署 NFT 合约
2. **02_deploy_LHT_Auction_Implementation.js** - 部署拍卖合约实现
3. **03_deploy_LHT_Auction_Factory_Implementation.js** - 部署工厂合约实现
4. **04_deploy_LHT_Auction_Factory_Proxy.js** - 部署工厂代理合约
5. **05_setup_price_feeds.js** - 设置价格预言机
6. **06_create_sample_auction.js** - 创建示例拍卖
7. **07_deploy_V2_Contracts.js** - 部署 V2 合约并升级（可选）

### 合约架构

```
LHT_NFT (NFT 合约)
    ↓
LHT_Auction (拍卖合约实现)
    ↓
LHT_Auction_Factory (工厂合约实现)
    ↓
LHT_Auction_Factory_Proxy (工厂代理合约)
```

## 🧪 测试

### 运行测试

```bash
# 运行所有测试
npm run test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 运行测试并生成 Gas 报告
npm run gas
```

### 测试文件

- `test/LHT_Auction_Factory.test.js` - 工厂合约测试
- `test/LHT_Auction.test.js` - 拍卖合约测试
- `test/SimpleUpgrade.test.js` - 合约升级功能测试
- `test/UpgradeFlow.test.js` - 完整升级流程测试

## 🧪 测试合约升级功能

### 运行升级测试
```bash
# 测试合约升级功能（推荐）
npx hardhat test test/SimpleUpgrade.test.js

# 测试完整升级流程（高级）
npx hardhat test test/UpgradeFlow.test.js
```

### 升级测试说明
- **`SimpleUpgrade.test.js`** (推荐): 测试基础的升级功能，验证 V1 和 V2 合约的版本差异和新功能
- **`UpgradeFlow.test.js`**: 测试完整的升级流程，包括合约升级和功能验证（需要进一步调试）

### 升级测试覆盖范围
✅ **V1 合约功能验证**
- NFT 合约部署和基本功能
- 拍卖合约 V1 部署和版本验证
- 工厂合约 V1 部署和版本验证

✅ **V2 合约功能验证**
- 拍卖合约 V2 部署和版本验证
- 工厂合约 V2 部署和版本验证
- V2 新功能测试（`getAuctionStats`, `getFactoryStats`）

✅ **版本对比验证**
- 正确区分 V1 (1.0) 和 V2 (2.0) 版本
- 验证版本差异和新功能可用性

### 升级到 V2
```bash
# 部署 V2 合约并升级
npx hardhat deploy --tags V2_Contracts
```

## 🔧 常用命令

```bash
# 编译合约
npm run compile

# 清理构建文件
npm run clean

# 重置部署（重新部署所有合约）
npm run deploy:reset

# 重置部署到本地
npm run deploy:reset:local

# 重置部署到 Sepolia
npm run deploy:reset:sepolia
```

## 📊 部署后验证

### 1. 检查合约状态

```javascript
// 获取工厂信息
const factoryInfo = await factoryContract.getFactoryInfo();
console.log("工厂信息:", factoryInfo);

// 获取版本信息
const versionInfo = await factoryContract.getFactoryVersion();
console.log("版本信息:", versionInfo);
```

### 2. 创建拍卖合约

```javascript
// 创建新的拍卖合约
const tx = await factoryContract.createAuction();
const receipt = await tx.wait();
const auctionAddress = receipt.events.find(e => e.event === 'AuctionCreated').args.auction;
console.log("拍卖合约地址:", auctionAddress);
```

### 3. 创建拍卖

```javascript
// 获取拍卖合约实例
const auctionContract = await ethers.getContractAt("LHT_Auction", auctionAddress);

// 创建拍卖
await auctionContract.createAuction(
  nftContract.address,  // NFT 合约地址
  1,                    // Token ID
  3600,                 // 拍卖时长 (1小时)
  ethers.parseEther("0.1"),  // 起拍价 0.1 ETH
  ethers.ZeroAddress    // ETH 拍卖
);
```

## 🔗 网络配置

### 本地网络
- **Chain ID**: 31337
- **RPC URL**: http://127.0.0.1:8545
- **Currency**: ETH

### Sepolia 测试网
- **Chain ID**: 11155111
- **RPC URL**: https://sepolia.infura.io/v3/your_project_id
- **Currency**: Sepolia ETH
- **区块确认数**: 6

## ⚠️ 注意事项

1. **私钥安全** - 请确保私钥安全，不要提交到版本控制系统
2. **Gas 费用** - Sepolia 部署需要 Sepolia ETH 支付 Gas 费用
3. **价格预言机** - 确保价格预言机地址正确
4. **合约验证** - 建议在部署后验证合约代码

## 🆘 故障排除

### 常见问题

1. **部署失败**
   - 检查私钥和 RPC URL 是否正确
   - 确保账户有足够的 ETH 支付 Gas 费用

2. **合约验证失败**
   - 检查 Etherscan API Key 是否正确
   - 确保合约代码已编译

3. **测试失败**
   - 检查合约依赖关系
   - 确保所有合约都已正确部署

4. **升级测试失败**
   - 使用 `SimpleUpgrade.test.js` 进行基础升级功能测试
   - 检查合约版本兼容性
   - 确保 UUPS 升级权限正确设置

### 获取帮助

如果遇到问题，请检查：
1. 控制台错误信息
2. 网络连接状态
3. 账户余额
4. 合约依赖关系

## 📝 更新日志

- **v2.0.0** - 升级版本
  - 新增拍卖合约 V2 (`getAuctionStats` 功能)
  - 新增工厂合约 V2 (`getFactoryStats` 功能)
  - 完整的合约升级测试套件
  - 改进的部署脚本和错误处理

- **v1.0.0** - 初始版本
  - 基础 NFT 合约
  - 拍卖合约
  - 工厂合约
  - UUPS 升级支持
  - 价格预言机集成
