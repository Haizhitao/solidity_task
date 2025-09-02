const { ethers } = require("hardhat");

module.exports = async function ({ getNamedAccounts, deployments, network }) {
  const { log, get } = deployments;
  const { deployer, user1 } = await getNamedAccounts();

  log("🚀 开始创建示例拍卖...");

  try {
    // 获取已部署的合约
    const lhtNFT = await get("LHT_NFT");
    const lhtAuctionFactoryProxy = await get("LHT_Auction_Factory_Proxy");
    
    const nftContract = await ethers.getContractAt("LHT_NFT", lhtNFT.address);
    const factoryContract = await ethers.getContractAt("LHT_Auction_Factory", lhtAuctionFactoryProxy.address);

    // 1. 铸造示例 NFT
    log("🎨 铸造示例 NFT...");
    const mintTx = await nftContract.mintNFT(deployer, "ipfs://QmExampleNFTMetadata");
    await mintTx.wait();
    log("✅ NFT 铸造成功");

    // 2. 创建拍卖合约
    log("🏭 创建拍卖合约...");
    const createAuctionTx = await factoryContract.createAuction();
    const createAuctionReceipt = await createAuctionTx.wait();
    
    // 获取创建的拍卖合约地址
    const auctionCreatedEvent = createAuctionReceipt.logs.find(log => {
      try {
        return factoryContract.interface.parseLog(log).name === 'AuctionCreated';
      } catch {
        return false;
      }
    });
    if (!auctionCreatedEvent) {
      throw new Error("未找到 AuctionCreated 事件");
    }
    const parsedEvent = factoryContract.interface.parseLog(auctionCreatedEvent);
    const auctionAddress = parsedEvent.args.auction;
    log(`✅ 拍卖合约创建成功: ${auctionAddress}`);

    // 3. 获取拍卖合约实例
    const auctionContract = await ethers.getContractAt("LHT_Auction", auctionAddress);

    // 4. 创建示例拍卖
    log("🎯 创建示例拍卖...");
    const createAuctionTx2 = await auctionContract.createAuction(
      lhtNFT.address,       // NFT 合约地址
      0,                    // Token ID (从0开始)
      3600,                 // 拍卖时长 (1小时)
      ethers.parseEther("0.1"),  // 起拍价 0.1 ETH
      ethers.ZeroAddress    // ETH 拍卖
    );
    await createAuctionTx2.wait();
    log("✅ 示例拍卖创建成功");

    // 5. 显示拍卖信息
    log("📊 显示拍卖信息...");
    const auctionInfo = await auctionContract.getAuctionInfo(0);
    log("📋 拍卖信息:");
    log(`   - NFT 合约: ${auctionInfo.nftContract}`);
    log(`   - Token ID: ${auctionInfo.nftTokenId}`);
    log(`   - 卖家: ${auctionInfo.seller}`);
    log(`   - 起拍价: ${ethers.formatEther(auctionInfo.startPrice)} ETH`);
    log(`   - 拍卖时长: ${auctionInfo.duration} 秒`);
    log(`   - 是否结束: ${auctionInfo.ended}`);

  } catch (error) {
    log("❌ 创建示例拍卖失败:", error.message);
    // 不抛出错误，让部署继续
  }

  log("🎉 示例拍卖创建完成");
};

module.exports.tags = ["all", "create_sample_auction"];
module.exports.dependencies = ["LHT_NFT", "LHT_Auction_Factory_Proxy", "setup_price_feeds"];
