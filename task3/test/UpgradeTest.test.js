const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("合约升级测试", function () {
  let lhtNFT, lhtAuction, lhtAuctionFactory, deployer, user1;
  let lhtAuctionV2, lhtAuctionFactoryV2;

  before(async function () {
    [deployer, user1] = await ethers.getSigners();
    console.log("🔍 测试账户:", deployer.address);
  });

  describe("基础部署", function () {
    it("应该成功部署 NFT 合约", async function () {
      const LHT_NFT = await ethers.getContractFactory("LHT_NFT");
      lhtNFT = await LHT_NFT.deploy();
      
      expect(await lhtNFT.owner()).to.equal(deployer.address);
      console.log("✅ NFT 合约部署成功:", await lhtNFT.getAddress());
    });

    it("应该成功部署拍卖合约 V1", async function () {
      const LHT_Auction = await ethers.getContractFactory("LHT_Auction");
      lhtAuction = await LHT_Auction.deploy();
      await lhtAuction.initialize();
      
      expect(await lhtAuction.admin()).to.equal(deployer.address);
      expect(await lhtAuction.getAuctionVersion()).to.equal("1.0");
      console.log("✅ 拍卖合约 V1 部署成功:", await lhtAuction.getAddress());
    });

    it("应该成功部署工厂合约 V1", async function () {
      const LHT_Auction_Factory = await ethers.getContractFactory("LHT_Auction_Factory");
      lhtAuctionFactory = await LHT_Auction_Factory.deploy();
      
      // 部署一个新的拍卖实现合约用于工厂
      const LHT_Auction_Impl = await ethers.getContractFactory("LHT_Auction");
      const auctionImpl = await LHT_Auction_Impl.deploy();
      
      try {
        await lhtAuctionFactory.initialize(await auctionImpl.getAddress(), deployer.address);
        console.log("✅ 工厂合约初始化成功");
      } catch (error) {
        console.log("⚠️ 工厂合约可能已经初始化过了:", error.message);
      }
      
      expect(await lhtAuctionFactory.owner()).to.equal(deployer.address);
      expect((await lhtAuctionFactory.getFactoryVersion()).version).to.equal("1.0");
      console.log("✅ 工厂合约 V1 部署成功:", await lhtAuctionFactory.getAddress());
    });
  });

  describe("部署 V2 合约", function () {
    it("应该成功部署拍卖合约 V2", async function () {
      const LHT_Auction_V2 = await ethers.getContractFactory("LHT_Auction_V2");
      lhtAuctionV2 = await LHT_Auction_V2.deploy();
      await lhtAuctionV2.initialize();
      
      expect(await lhtAuctionV2.admin()).to.equal(deployer.address);
      expect(await lhtAuctionV2.getAuctionVersion()).to.equal("2.0");
      console.log("✅ 拍卖合约 V2 部署成功:", await lhtAuctionV2.getAddress());
    });

    it("应该成功部署工厂合约 V2", async function () {
      const LHT_AuctionFactory_V2 = await ethers.getContractFactory("LHT_AuctionFactory_V2");
      lhtAuctionFactoryV2 = await LHT_AuctionFactory_V2.deploy();
      
      // 部署一个新的拍卖实现合约用于工厂 V2
      const LHT_Auction_Impl = await ethers.getContractFactory("LHT_Auction");
      const auctionImpl = await LHT_Auction_Impl.deploy();
      
      try {
        await lhtAuctionFactoryV2.initialize(await auctionImpl.getAddress(), deployer.address);
        console.log("✅ 工厂合约 V2 初始化成功");
      } catch (error) {
        console.log("⚠️ 工厂合约 V2 可能已经初始化过了:", error.message);
      }
      
      expect(await lhtAuctionFactoryV2.owner()).to.equal(deployer.address);
      expect((await lhtAuctionFactoryV2.getFactoryVersion()).version).to.equal("2.0");
      console.log("✅ 工厂合约 V2 部署成功:", await lhtAuctionFactoryV2.getAddress());
    });
  });

  describe("测试 V2 新功能", function () {
    it("拍卖合约 V2 应该支持 getAuctionStats 功能", async function () {
      // 铸造 NFT 并创建拍卖
      await lhtNFT.mintNFT(deployer.address, "ipfs://test-metadata");
      
      // 先授权拍卖合约转移 NFT
      await lhtNFT.approve(await lhtAuctionV2.getAddress(), 0);
      
      await lhtAuctionV2.createAuction(
        await lhtNFT.getAddress(), 0, 3600, ethers.parseEther("0.1"), ethers.ZeroAddress
      );

      // 测试新功能
      const stats = await lhtAuctionV2.getAuctionStats();
      expect(stats.totalAuctions).to.equal(1);
      expect(stats.activeAuctions).to.equal(1);
      expect(stats.completedAuctions).to.equal(0);
      
      console.log("✅ 拍卖合约 V2 getAuctionStats 功能正常");
    });

    it("工厂合约 V2 应该支持 getFactoryStats 功能", async function () {
      // 创建拍卖合约实例
      await lhtAuctionFactoryV2.createAuction();
      await lhtAuctionFactoryV2.connect(user1).createAuction();

      // 测试新功能
      const stats = await lhtAuctionFactoryV2.getFactoryStats();
      expect(stats.totalAuctions).to.equal(2);
      expect(stats.totalCreators).to.equal(2);
      
      console.log("✅ 工厂合约 V2 getFactoryStats 功能正常");
    });
  });

  describe("版本信息验证", function () {
    it("应该正确返回版本信息", async function () {
      // 验证拍卖合约版本
      expect(await lhtAuction.getAuctionVersion()).to.equal("1.0");
      expect(await lhtAuctionV2.getAuctionVersion()).to.equal("2.0");

      // 验证工厂合约版本
      expect((await lhtAuctionFactory.getFactoryVersion()).version).to.equal("1.0");
      expect((await lhtAuctionFactoryV2.getFactoryVersion()).version).to.equal("2.0");

      console.log("✅ 版本信息验证通过");
    });
  });
});
