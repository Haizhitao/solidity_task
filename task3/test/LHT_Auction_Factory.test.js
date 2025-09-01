const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LHT_Auction_Factory", function () {
  let lhtNFT, lhtAuctionFactory, deployer, user1, user2;

  beforeEach(async function () {
    [deployer, user1, user2] = await ethers.getSigners();

    // 部署 NFT 合约
    const LHT_NFT = await ethers.getContractFactory("LHT_NFT");
    lhtNFT = await LHT_NFT.deploy();

    // 部署拍卖合约实现
    const LHT_Auction = await ethers.getContractFactory("LHT_Auction");
    const lhtAuctionImplementation = await LHT_Auction.deploy();

    // 部署工厂合约实现
    const LHT_Auction_Factory = await ethers.getContractFactory("LHT_Auction_Factory");
    const lhtAuctionFactoryImplementation = await LHT_Auction_Factory.deploy();

    // 部署工厂代理合约
    const lhtAuctionFactoryProxy = await ethers.deployProxy(
      lhtAuctionFactoryImplementation,
      [lhtAuctionImplementation.address, deployer.address],
      { initializer: 'initialize' }
    );

    lhtAuctionFactory = await ethers.getContractAt("LHT_Auction_Factory", lhtAuctionFactoryProxy.address);
  });

  describe("部署", function () {
    it("应该正确部署工厂合约", async function () {
      expect(await lhtAuctionFactory.owner()).to.equal(deployer.address);
      expect(await lhtAuctionFactory.auctionImplementation()).to.not.equal(ethers.ZeroAddress);
    });

    it("应该正确初始化工厂合约", async function () {
      const factoryInfo = await lhtAuctionFactory.getFactoryInfo();
      expect(factoryInfo.implementation).to.not.equal(ethers.ZeroAddress);
      expect(factoryInfo.totalAuctions).to.equal(0);
      expect(factoryInfo.owner).to.equal(deployer.address);
    });
  });

  describe("创建拍卖合约", function () {
    it("应该能够创建拍卖合约", async function () {
      const tx = await lhtAuctionFactory.createAuction();
      const receipt = await tx.wait();

      const auctionCreatedEvent = receipt.events.find(e => e.event === 'AuctionCreated');
      expect(auctionCreatedEvent).to.not.be.undefined;

      const auctionAddress = auctionCreatedEvent.args.auction;
      expect(await lhtAuctionFactory.isValidAuction(auctionAddress)).to.be.true;
      expect(await lhtAuctionFactory.getAuctionCreator(auctionAddress)).to.equal(deployer.address);
    });

    it("应该正确记录用户创建的拍卖合约", async function () {
      await lhtAuctionFactory.createAuction();
      expect(await lhtAuctionFactory.getUserAuctionsCount(deployer.address)).to.equal(1);
    });

    it("应该能够获取用户创建的拍卖合约列表", async function () {
      await lhtAuctionFactory.createAuction();
      const userAuctions = await lhtAuctionFactory.getUserAuctions(deployer.address, 0, 0);
      expect(userAuctions.length).to.equal(1);
    });
  });

  describe("升级功能", function () {
    it("只有所有者可以更新实现地址", async function () {
      const newImplementation = ethers.Wallet.createRandom().address;
      
      await expect(
        lhtAuctionFactory.connect(user1).updateImplementation(newImplementation)
      ).to.be.revertedWithCustomError(lhtAuctionFactory, "OwnableUnauthorizedAccount");

      await expect(
        lhtAuctionFactory.updateImplementation(newImplementation)
      ).to.not.be.reverted;
    });

    it("应该能够升级拍卖合约", async function () {
      // 创建拍卖合约
      const tx = await lhtAuctionFactory.createAuction();
      const receipt = await tx.wait();
      const auctionAddress = receipt.events.find(e => e.event === 'AuctionCreated').args.auction;

      // 部署新的拍卖实现
      const LHT_Auction_V2 = await ethers.getContractFactory("LHT_Auction_V2");
      const newImplementation = await LHT_Auction_V2.deploy();

      // 升级拍卖合约
      await expect(
        lhtAuctionFactory.upgradeAuction(auctionAddress, newImplementation.address)
      ).to.not.be.reverted;
    });
  });

  describe("查询功能", function () {
    beforeEach(async function () {
      // 创建多个拍卖合约
      await lhtAuctionFactory.createAuction();
      await lhtAuctionFactory.connect(user1).createAuction();
      await lhtAuctionFactory.connect(user2).createAuction();
    });

    it("应该正确返回所有拍卖合约数量", async function () {
      expect(await lhtAuctionFactory.getAllAuctionsCount()).to.equal(3);
    });

    it("应该正确返回最近的拍卖合约", async function () {
      const recentAuctions = await lhtAuctionFactory.getRecentAuctions(2);
      expect(recentAuctions.length).to.equal(2);
    });

    it("应该正确验证拍卖合约地址", async function () {
      const allAuctions = await lhtAuctionFactory.allAuctions(0);
      expect(await lhtAuctionFactory.isValidAuction(allAuctions)).to.be.true;
      expect(await lhtAuctionFactory.isValidAuction(ethers.ZeroAddress)).to.be.false;
    });
  });

  describe("版本信息", function () {
    it("应该返回正确的版本信息", async function () {
      const versionInfo = await lhtAuctionFactory.getFactoryVersion();
      expect(versionInfo.version).to.equal("1.0");
      expect(versionInfo.implementation).to.not.equal(ethers.ZeroAddress);
    });
  });
});
