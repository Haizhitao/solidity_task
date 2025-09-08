const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("NFT拍卖系统完整测试", function () {
  let nft, beacon, factory, nftAuctionImpl;
  let owner, seller, bidder1, bidder2, bidder3;
  let tokenId;
  let auctionAddress;

  // 测试用的ERC20代币合约
  let erc20Token;

  beforeEach(async function () {
    // 获取测试账户
    [owner, seller, bidder1, bidder2, bidder3] = await ethers.getSigners();

    // 部署NFT合约
    const Nft = await ethers.getContractFactory("Nft");
    nft = await Nft.deploy();
    await nft.waitForDeployment();

    // 部署NftAuction实现合约
    const NftAuction = await ethers.getContractFactory("NftAuction");
    nftAuctionImpl = await NftAuction.deploy();
    await nftAuctionImpl.waitForDeployment();

    // 部署Beacon合约
    const NftAuctionBeacon = await ethers.getContractFactory("NftAuctionBeacon");
    beacon = await NftAuctionBeacon.deploy(await nftAuctionImpl.getAddress());
    await beacon.waitForDeployment();

    // 部署Factory合约
    const NftAuctionFactory = await ethers.getContractFactory("NftAuctionFactory");
    factory = await upgrades.deployProxy(
      NftAuctionFactory,
      [await beacon.getAddress()],
      {
        initializer: "initialize",
        kind: "uups"
      }
    );
    await factory.waitForDeployment();

    // 部署测试用的ERC20代币
    const ERC20Token = await ethers.getContractFactory("contracts/test/TestERC20.sol:TestERC20");
    erc20Token = await ERC20Token.deploy("Test Token", "TEST", ethers.parseEther("1000000"));
    await erc20Token.waitForDeployment();

    // 给测试账户分配代币
    await erc20Token.transfer(bidder1.address, ethers.parseEther("1000"));
    await erc20Token.transfer(bidder2.address, ethers.parseEther("1000"));
    await erc20Token.transfer(bidder3.address, ethers.parseEther("1000"));

    // 铸造NFT给卖家
    const metadataURI = "https://example.com/metadata/1";
    await nft.mintNFT(seller.address, metadataURI);
    tokenId = 0; // 第一个铸造的NFT的tokenId是0

    // 卖家授权Factory合约转移NFT
    await nft.connect(seller).setApprovalForAll(await factory.getAddress(), true);
  });

  describe("NFT合约测试", function () {
    it("正确铸造NFT", async function () {
      expect(await nft.ownerOf(tokenId)).to.equal(seller.address);
      expect(await nft.tokenURI(tokenId)).to.equal("https://example.com/metadata/1");
    });

    it("防止重复的元数据URI", async function () {
      await expect(
        nft.mintNFT(seller.address, "https://example.com/metadata/1")
      ).to.be.revertedWith("Token URI already exists");
    });
  });

  describe("Factory合约测试", function () {
    it("正确创建ETH拍卖", async function () {
      const startTime = Math.floor(Date.now() / 1000) + 60; // 1分钟后开始
      const auctionDuration = 3600; // 1小时
      const reservePrice = ethers.parseEther("1");
      const bidIncrement = ethers.parseEther("0.1");

      const tx = await factory.connect(seller).createAuctionWithETH(
        await nft.getAddress(),
        tokenId,
        reservePrice,
        bidIncrement,
        auctionDuration,
        startTime
      );

      const receipt = await tx.wait();
      const auctionCreatedEvent = receipt.logs.find(
        log => log.topics[0] === factory.interface.getEvent("AuctionCreated").topicHash
      );

      expect(auctionCreatedEvent).to.not.be.undefined;
      
      const auctionCount = await factory.getAuctionCount();
      expect(auctionCount).to.equal(1);
    });

    it("正确创建ERC20代币拍卖", async function () {
      const startTime = Math.floor(Date.now() / 1000) + 60;
      const auctionDuration = 3600;
      const reservePrice = ethers.parseEther("100");
      const bidIncrement = ethers.parseEther("10");

      const tx = await factory.connect(seller).createAuctionWithERC20(
        await nft.getAddress(),
        tokenId,
        await erc20Token.getAddress(),
        reservePrice,
        bidIncrement,
        auctionDuration,
        startTime
      );

      const receipt = await tx.wait();
      const auctionCreatedEvent = receipt.logs.find(
        log => log.topics[0] === factory.interface.getEvent("AuctionCreated").topicHash
      );

      expect(auctionCreatedEvent).to.not.be.undefined;
    });

    it("验证NFT所有权", async function () {
      const startTime = Math.floor(Date.now() / 1000) + 60;
      const auctionDuration = 3600;
      const reservePrice = ethers.parseEther("1");
      const bidIncrement = ethers.parseEther("0.1");

      await expect(
        factory.connect(bidder1).createAuctionWithETH(
          await nft.getAddress(),
          tokenId,
          reservePrice,
          bidIncrement,
          auctionDuration,
          startTime
        )
      ).to.be.revertedWith("Not the owner of the NFT");
    });
  });

  //补充拍卖流程测试
  //...

  describe("升级测试", function () {
    it("升级Factory合约", async function () {
      // 部署V2版本
      const NftAuctionFactoryV2 = await ethers.getContractFactory("NftAuctionFactoryV2");
      
      const upgradedFactory = await upgrades.upgradeProxy(
        await factory.getAddress(),
        NftAuctionFactoryV2
      );
      await upgradedFactory.waitForDeployment();

      // 验证升级
      const version = await upgradedFactory.getVersion();
      expect(version).to.equal("2.0");
    });

    it("升级Beacon合约", async function () {
      // 部署V2版本
      const NftAuctionV2 = await ethers.getContractFactory("NftAuctionV2");
      const nftAuctionV2Impl = await NftAuctionV2.deploy();
      await nftAuctionV2Impl.waitForDeployment();

      // 升级Beacon
      await beacon.upgradeTo(await nftAuctionV2Impl.getAddress());

      // 验证升级
      const newImplementation = await beacon.implementation();
      expect(newImplementation).to.equal(await nftAuctionV2Impl.getAddress());
    });
  });

});
