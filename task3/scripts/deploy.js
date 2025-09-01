const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 开始部署 LHT Auction 系统...\n");

  const [deployer] = await ethers.getSigners();
  console.log("📋 部署账户:", deployer.address);
  console.log("💰 账户余额:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  try {
    // 1. 部署 NFT 合约
    console.log("🎨 步骤 1: 部署 LHT_NFT 合约...");
    const LHT_NFT = await ethers.getContractFactory("LHT_NFT");
    const lhtNFT = await LHT_NFT.deploy();
    await lhtNFT.waitForDeployment();
    console.log("✅ LHT_NFT 合约已部署:", await lhtNFT.getAddress());

    // 2. 部署拍卖合约实现
    console.log("\n🏗️ 步骤 2: 部署 LHT_Auction 实现合约...");
    const LHT_Auction = await ethers.getContractFactory("LHT_Auction");
    const lhtAuctionImplementation = await LHT_Auction.deploy();
    await lhtAuctionImplementation.waitForDeployment();
    console.log("✅ LHT_Auction 实现合约已部署:", await lhtAuctionImplementation.getAddress());

    // 3. 部署工厂合约实现
    console.log("\n🏭 步骤 3: 部署 LHT_Auction_Factory 实现合约...");
    const LHT_Auction_Factory = await ethers.getContractFactory("LHT_Auction_Factory");
    const lhtAuctionFactoryImplementation = await LHT_Auction_Factory.deploy();
    await lhtAuctionFactoryImplementation.waitForDeployment();
    console.log("✅ LHT_Auction_Factory 实现合约已部署:", await lhtAuctionFactoryImplementation.getAddress());

    // 4. 部署工厂代理合约
    console.log("\n🔧 步骤 4: 部署 LHT_Auction_Factory 代理合约...");
    const lhtAuctionFactoryProxy = await ethers.deployProxy(
      lhtAuctionFactoryImplementation,
      [await lhtAuctionImplementation.getAddress(), deployer.address],
      { initializer: 'initialize' }
    );
    await lhtAuctionFactoryProxy.waitForDeployment();
    console.log("✅ LHT_Auction_Factory 代理合约已部署:", await lhtAuctionFactoryProxy.getAddress());

    // 5. 获取工厂合约实例
    const factoryContract = await ethers.getContractAt("LHT_Auction_Factory", await lhtAuctionFactoryProxy.getAddress());

    // 6. 验证工厂合约状态
    console.log("\n🔍 步骤 5: 验证工厂合约状态...");
    const factoryInfo = await factoryContract.getFactoryInfo();
    console.log("📊 工厂信息:");
    console.log("   - 实现地址:", factoryInfo.implementation);
    console.log("   - 总拍卖数量:", factoryInfo.totalAuctions.toString());
    console.log("   - 工厂所有者:", factoryInfo.owner);

    const factoryVersion = await factoryContract.getFactoryVersion();
    console.log("📋 版本信息:");
    console.log("   - 版本号:", factoryVersion.version);
    console.log("   - 实现地址:", factoryVersion.implementation);

    // 7. 创建示例拍卖合约
    console.log("\n🎯 步骤 6: 创建示例拍卖合约...");
    const createAuctionTx = await factoryContract.createAuction();
    const createAuctionReceipt = await createAuctionTx.wait();
    
    const auctionCreatedEvent = createAuctionReceipt.events.find(e => e.event === 'AuctionCreated');
    const auctionAddress = auctionCreatedEvent.args.auction;
    console.log("✅ 示例拍卖合约已创建:", auctionAddress);

    // 8. 铸造示例 NFT
    console.log("\n🎨 步骤 7: 铸造示例 NFT...");
    const mintTx = await lhtNFT.mintNFT(deployer.address, "ipfs://QmExampleNFTMetadata");
    await mintTx.wait();
    console.log("✅ 示例 NFT 已铸造");

    // 9. 获取拍卖合约实例并创建拍卖
    console.log("\n🏷️ 步骤 8: 创建示例拍卖...");
    const auctionContract = await ethers.getContractAt("LHT_Auction", auctionAddress);
    
    const createAuctionTx2 = await auctionContract.createAuction(
      await lhtNFT.getAddress(),  // NFT 合约地址
      1,                          // Token ID
      3600,                       // 拍卖时长 (1小时)
      ethers.parseEther("0.1"),   // 起拍价 0.1 ETH
      ethers.ZeroAddress          // ETH 拍卖
    );
    await createAuctionTx2.wait();
    console.log("✅ 示例拍卖已创建");

    // 10. 显示拍卖信息
    console.log("\n📊 步骤 9: 显示拍卖信息...");
    const auctionInfo = await auctionContract.getAuctionInfo(0);
    console.log("📋 拍卖信息:");
    console.log("   - NFT 合约:", auctionInfo.nftContract);
    console.log("   - Token ID:", auctionInfo.nftTokenId.toString());
    console.log("   - 卖家:", auctionInfo.seller);
    console.log("   - 起拍价:", ethers.formatEther(auctionInfo.startPrice), "ETH");
    console.log("   - 拍卖时长:", auctionInfo.duration.toString(), "秒");
    console.log("   - 是否结束:", auctionInfo.ended);

    // 11. 验证系统功能
    console.log("\n🧪 步骤 10: 验证系统功能...");
    
    // 验证拍卖合约
    const isValid = await factoryContract.isValidAuction(auctionAddress);
    console.log("✅ 拍卖合约验证:", isValid);

    // 获取用户拍卖合约
    const userCount = await factoryContract.getUserAuctionsCount(deployer.address);
    console.log("✅ 用户拍卖合约数量:", userCount.toString());

    // 获取最近的拍卖合约
    const recentAuctions = await factoryContract.getRecentAuctions(3);
    console.log("✅ 最近的拍卖合约数量:", recentAuctions.length);

    console.log("\n🎉 部署完成！LHT Auction 系统已成功部署。");
    console.log("\n📋 部署摘要:");
    console.log("   - LHT_NFT:", await lhtNFT.getAddress());
    console.log("   - LHT_Auction 实现:", await lhtAuctionImplementation.getAddress());
    console.log("   - LHT_Auction_Factory 实现:", await lhtAuctionFactoryImplementation.getAddress());
    console.log("   - LHT_Auction_Factory 代理:", await lhtAuctionFactoryProxy.getAddress());
    console.log("   - 示例拍卖合约:", auctionAddress);
    console.log("   - 部署账户:", deployer.address);

    console.log("\n🔗 系统功能:");
    console.log("   1. NFT 铸造和管理");
    console.log("   2. 拍卖合约创建和管理");
    console.log("   3. 工厂模式管理");
    console.log("   4. UUPS 升级支持");
    console.log("   5. 价格预言机集成");

    console.log("\n📝 下一步操作:");
    console.log("   1. 设置价格预言机");
    console.log("   2. 创建更多拍卖");
    console.log("   3. 测试出价功能");
    console.log("   4. 运行完整测试套件");

  } catch (error) {
    console.error("❌ 部署失败:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
