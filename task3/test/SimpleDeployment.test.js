const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("简单部署测试", function () {
  let lhtNFT, lhtAuction, lhtAuctionFactory, deployer, user1;

  before(async function () {
    [deployer, user1] = await ethers.getSigners();
    console.log("🔍 测试账户:", deployer.address);
  });

  it("应该成功部署 NFT 合约", async function () {
    const LHT_NFT = await ethers.getContractFactory("LHT_NFT");
    lhtNFT = await LHT_NFT.deploy();
    
    expect(await lhtNFT.owner()).to.equal(deployer.address);
    console.log("✅ NFT 合约部署成功:", await lhtNFT.getAddress());
  });

  it("应该成功部署拍卖合约", async function () {
    const LHT_Auction = await ethers.getContractFactory("LHT_Auction");
    lhtAuction = await LHT_Auction.deploy();
    await lhtAuction.initialize();
    
    expect(await lhtAuction.admin()).to.equal(deployer.address);
    console.log("✅ 拍卖合约部署成功:", await lhtAuction.getAddress());
  });

  it("应该成功部署工厂合约", async function () {
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
    console.log("✅ 工厂合约部署成功:", await lhtAuctionFactory.getAddress());
  });

  it("应该成功铸造 NFT", async function () {
    const mintTx = await lhtNFT.mintNFT(deployer.address, "ipfs://test-metadata");
    await mintTx.wait();
    
    expect(await lhtNFT.ownerOf(0)).to.equal(deployer.address);
    console.log("✅ NFT 铸造成功, Token ID: 0");
  });

  it("应该成功创建拍卖合约实例", async function () {
    const createTx = await lhtAuctionFactory.createAuction();
    const receipt = await createTx.wait();
    
    const auctionCreatedEvent = receipt.logs.find(log => {
      try {
        return lhtAuctionFactory.interface.parseLog(log).name === 'AuctionCreated';
      } catch {
        return false;
      }
    });
    
    expect(auctionCreatedEvent).to.not.be.undefined;
    const parsedEvent = lhtAuctionFactory.interface.parseLog(auctionCreatedEvent);
    console.log("✅ 拍卖合约实例创建成功:", parsedEvent.args.auction);
  });

  it("应该正确返回版本信息", async function () {
    const auctionVersion = await lhtAuction.getAuctionVersion();
    const factoryVersion = await lhtAuctionFactory.getFactoryVersion();
    
    expect(auctionVersion).to.equal("1.0");
    expect(factoryVersion.version).to.equal("1.0");
    
    console.log("✅ 版本信息正确 - 拍卖:", auctionVersion, "工厂:", factoryVersion.version);
  });
});
