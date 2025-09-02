const { ethers } = require("hardhat");

module.exports = async function ({ getNamedAccounts, deployments, network }) {
  const { deploy, log, get } = deployments;
  const { deployer } = await getNamedAccounts();

  log("🚀 开始部署 V2 合约...");

  try {
    // 1. 部署拍卖合约 V2 实现
    log("🏗️ 部署 LHT_Auction_V2 实现合约...");
    const lhtAuctionV2Implementation = await deploy("LHT_Auction_V2", {
      from: deployer,
      args: [],
      log: true,
      waitConfirmations: network.name === "hardhat" ? 1 : 6,
    });

    log(`✅ LHT_Auction_V2 实现合约已部署到: ${lhtAuctionV2Implementation.address}`);

    // 2. 部署工厂合约 V2 实现
    log("🏭 部署 LHT_AuctionFactory_V2 实现合约...");
    const lhtAuctionFactoryV2Implementation = await deploy("LHT_AuctionFactory_V2", {
      from: deployer,
      args: [],
      log: true,
      waitConfirmations: network.name === "hardhat" ? 1 : 6,
    });

    log(`✅ LHT_AuctionFactory_V2 实现合约已部署到: ${lhtAuctionFactoryV2Implementation.address}`);

    // 3. 获取已部署的 V1 工厂代理合约
    const lhtAuctionFactoryProxy = await get("LHT_Auction_Factory_Proxy");
    const factoryContract = await ethers.getContractAt("LHT_Auction_Factory", lhtAuctionFactoryProxy.address);

    // 4. 升级工厂合约到 V2
    log("🔄 升级工厂合约到 V2...");
    try {
      // 使用 UUPS 升级函数
      const upgradeTx = await factoryContract.upgradeTo(lhtAuctionFactoryV2Implementation.address);
      await upgradeTx.wait();
      log("✅ 工厂合约升级到 V2 成功");
    } catch (error) {
      log("❌ 工厂合约升级失败:", error.message);
    }

    // 5. 验证升级后的功能
    log("🔍 验证升级后的功能...");
    try {
      const factoryVersion = await factoryContract.getFactoryVersion();
      log(`📋 工厂版本信息: ${factoryVersion.version}`);

      // 测试 V2 的新功能 - 使用正确的接口
      const factoryV2Contract = await ethers.getContractAt("LHT_AuctionFactory_V2", lhtAuctionFactoryProxy.address);
      const stats = await factoryV2Contract.getFactoryStats();
      log(`📊 工厂统计信息: 总拍卖数=${stats.totalAuctions}, 总创建者数=${stats.totalCreators}`);
      
      log("✅ V2 新功能验证成功");
    } catch (error) {
      log("⚠️ V2 新功能验证失败:", error.message);
    }

    // 6. 创建示例拍卖合约并升级到 V2
    log("🎯 创建示例拍卖合约并升级到 V2...");
    try {
      // 创建拍卖合约
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
      
      if (auctionCreatedEvent) {
        const parsedEvent = factoryContract.interface.parseLog(auctionCreatedEvent);
        const auctionAddress = parsedEvent.args.auction;
        log(`✅ 拍卖合约创建成功: ${auctionAddress}`);

        // 升级拍卖合约到 V2
        const upgradeAuctionTx = await factoryContract.upgradeAuction(
          auctionAddress, 
          lhtAuctionV2Implementation.address
        );
        await upgradeAuctionTx.wait();
        log("✅ 拍卖合约升级到 V2 成功");

        // 验证升级后的功能
        const auctionContract = await ethers.getContractAt("LHT_Auction_V2", auctionAddress);
        const auctionVersion = await auctionContract.getAuctionVersion();
        log(`📋 拍卖合约版本: ${auctionVersion}`);

        // 测试 V2 的新功能
        const auctionStats = await auctionContract.getAuctionStats();
        log(`📊 拍卖统计信息: 总拍卖数=${auctionStats.totalAuctions}`);
        
        log("✅ 拍卖合约 V2 功能验证成功");
      }
    } catch (error) {
      log("❌ 拍卖合约升级测试失败:", error.message);
    }

  } catch (error) {
    log("❌ V2 合约部署失败:", error.message);
  }

  log("🎉 V2 合约部署完成");
};

module.exports.tags = ["all", "V2_Contracts"];
module.exports.dependencies = ["LHT_Auction_Factory_Proxy"];
