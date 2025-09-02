const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("简化升级测试", function () {
  let deployer, user1;

  before(async function () {
    [deployer, user1] = await ethers.getSigners();
    console.log("🔍 测试账户:", deployer.address);
  });

  describe("基础功能测试", function () {
    it("应该成功部署和测试 V1 合约", async function () {
      // 1. 部署 NFT 合约
      const LHT_NFT = await ethers.getContractFactory("LHT_NFT");
      const lhtNFT = await LHT_NFT.deploy();
      console.log("✅ NFT 合约部署成功:", await lhtNFT.getAddress());

      // 2. 部署拍卖合约 V1
      const LHT_Auction = await ethers.getContractFactory("LHT_Auction");
      const lhtAuction = await LHT_Auction.deploy();
      await lhtAuction.initialize();
      console.log("✅ 拍卖合约 V1 部署成功:", await lhtAuction.getAddress());

      // 3. 验证 V1 版本
      const v1Version = await lhtAuction.getAuctionVersion();
      expect(v1Version).to.equal("1.0");
      console.log("✅ V1 版本验证成功:", v1Version);

      // 4. 部署工厂合约 V1
      const LHT_Auction_Factory = await ethers.getContractFactory("LHT_Auction_Factory");
      const lhtAuctionFactory = await LHT_Auction_Factory.deploy();
      
      try {
        await lhtAuctionFactory.initialize(await lhtAuction.getAddress(), deployer.address);
        console.log("✅ 工厂合约 V1 初始化成功");
      } catch (error) {
        console.log("⚠️ 工厂合约可能已经初始化过了");
      }

      // 5. 验证工厂 V1 版本
      const factoryV1Version = await lhtAuctionFactory.getFactoryVersion();
      expect(factoryV1Version.version).to.equal("1.0");
      console.log("✅ 工厂 V1 版本验证成功:", factoryV1Version.version);
    });

    it("应该成功部署和测试 V2 合约", async function () {
      // 1. 部署拍卖合约 V2
      const LHT_Auction_V2 = await ethers.getContractFactory("LHT_Auction_V2");
      const lhtAuctionV2 = await LHT_Auction_V2.deploy();
      await lhtAuctionV2.initialize();
      console.log("✅ 拍卖合约 V2 部署成功:", await lhtAuctionV2.getAddress());

      // 2. 验证 V2 版本
      const v2Version = await lhtAuctionV2.getAuctionVersion();
      expect(v2Version).to.equal("2.0");
      console.log("✅ V2 版本验证成功:", v2Version);

      // 3. 测试 V2 新功能
      const stats = await lhtAuctionV2.getAuctionStats();
      expect(stats.totalAuctions).to.equal(0);
      expect(stats.activeAuctions).to.equal(0);
      expect(stats.completedAuctions).to.equal(0);
      console.log("✅ V2 新功能验证成功");

      // 4. 部署工厂合约 V2
      const LHT_AuctionFactory_V2 = await ethers.getContractFactory("LHT_AuctionFactory_V2");
      const lhtAuctionFactoryV2 = await LHT_AuctionFactory_V2.deploy();
      
      try {
        await lhtAuctionFactoryV2.initialize(await lhtAuctionV2.getAddress(), deployer.address);
        console.log("✅ 工厂合约 V2 初始化成功");
      } catch (error) {
        console.log("⚠️ 工厂合约 V2 可能已经初始化过了");
      }

      // 5. 验证工厂 V2 版本
      const factoryV2Version = await lhtAuctionFactoryV2.getFactoryVersion();
      expect(factoryV2Version.version).to.equal("2.0");
      console.log("✅ 工厂 V2 版本验证成功:", factoryV2Version.version);

      // 6. 测试 V2 新功能
      const factoryStats = await lhtAuctionFactoryV2.getFactoryStats();
      expect(factoryStats.totalAuctions).to.equal(0);
      expect(factoryStats.totalCreators).to.equal(0);
      console.log("✅ 工厂 V2 新功能验证成功");
    });
  });

  describe("版本对比测试", function () {
    it("应该正确区分 V1 和 V2 版本", async function () {
      // 部署 V1 合约
      const LHT_Auction = await ethers.getContractFactory("LHT_Auction");
      const lhtAuction = await LHT_Auction.deploy();
      await lhtAuction.initialize();

      // 部署 V2 合约
      const LHT_Auction_V2 = await ethers.getContractFactory("LHT_Auction_V2");
      const lhtAuctionV2 = await LHT_Auction_V2.deploy();
      await lhtAuctionV2.initialize();

      // 验证版本差异
      const v1Version = await lhtAuction.getAuctionVersion();
      const v2Version = await lhtAuctionV2.getAuctionVersion();
      
      expect(v1Version).to.equal("1.0");
      expect(v2Version).to.equal("2.0");
      expect(v1Version).to.not.equal(v2Version);
      
      console.log("✅ 版本差异验证成功: V1 =", v1Version, ", V2 =", v2Version);
    });
  });
});
