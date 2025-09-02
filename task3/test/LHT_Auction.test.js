const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LHT_Auction", function () {
  let lhtNFT, lhtAuction, deployer, user1, user2;

  beforeEach(async function () {
    [deployer, user1, user2] = await ethers.getSigners();

    // 部署 NFT 合约
    const LHT_NFT = await ethers.getContractFactory("LHT_NFT");
    lhtNFT = await LHT_NFT.deploy();

    // 部署拍卖合约
    const LHT_Auction = await ethers.getContractFactory("LHT_Auction");
    lhtAuction = await LHT_Auction.deploy();
    await lhtAuction.initialize();

    // 部署模拟价格预言机合约
    const MockPriceFeed = await ethers.getContractFactory("contracts/mocks/MockPriceFeed.sol:MockPriceFeed");
    const mockPriceFeed = await MockPriceFeed.deploy(
      8, // decimals
      ethers.parseUnits("2000", 8) // initial price
    );
    
    // 设置价格预言机
    await lhtAuction.setPriceFeed(ethers.ZeroAddress, await mockPriceFeed.getAddress());
  });

  describe("初始化", function () {
    it("应该正确初始化拍卖合约", async function () {
      expect(await lhtAuction.admin()).to.equal(deployer.address);
      expect(await lhtAuction.factory()).to.equal(deployer.address);
      expect(await lhtAuction.paused()).to.be.false;
    });

    it("应该防止重复初始化", async function () {
      await expect(lhtAuction.initialize()).to.be.revertedWith("Already initialized");
    });
  });

  describe("权限控制", function () {
    it("只有管理员可以创建拍卖", async function () {
      await lhtNFT.mintNFT(deployer.address, "ipfs://test");
      
      await expect(
        lhtAuction.connect(user1).createAuction(
          lhtNFT.address, 1, 3600, ethers.parseEther("0.1"), ethers.ZeroAddress
        )
      ).to.be.revertedWith("only admin can create auction");
    });

    it("只有管理员可以设置价格预言机", async function () {
      await expect(
        lhtAuction.connect(user1).setPriceFeed(ethers.ZeroAddress, ethers.ZeroAddress)
      ).to.be.revertedWith("Only admin can call this function");
    });

    it("只有管理员可以暂停合约", async function () {
      await expect(
        lhtAuction.connect(user1).pause()
      ).to.be.revertedWith("Only admin can call this function");
    });
  });

  describe("创建拍卖", function () {
    beforeEach(async function () {
      await lhtNFT.mintNFT(deployer.address, "ipfs://test");
    });

         it("应该能够创建拍卖", async function () {
       await expect(
         lhtAuction.createAuction(
           await lhtNFT.getAddress(), 0, 3600, ethers.parseEther("0.1"), ethers.ZeroAddress
         )
       ).to.not.be.reverted;

       const auctionInfo = await lhtAuction.getAuctionInfo(0);
       expect(auctionInfo.nftContract).to.equal(await lhtNFT.getAddress());
      expect(auctionInfo.nftTokenId).to.equal(1);
      expect(auctionInfo.seller).to.equal(deployer.address);
      expect(auctionInfo.startPrice).to.equal(ethers.parseEther("0.1"));
      expect(auctionInfo.ended).to.be.false;
    });

    it("应该验证输入参数", async function () {
      await expect(
        lhtAuction.createAuction(
          ethers.ZeroAddress, 1, 3600, ethers.parseEther("0.1"), ethers.ZeroAddress
        )
      ).to.be.revertedWith("Invalid NFT contract address");

      await expect(
        lhtAuction.createAuction(
          lhtNFT.address, 1, 0, ethers.parseEther("0.1"), ethers.ZeroAddress
        )
      ).to.be.revertedWith("duration must be greater than 0");

      await expect(
        lhtAuction.createAuction(
          lhtNFT.address, 1, 3600, 0, ethers.ZeroAddress
        )
      ).to.be.revertedWith("startPrice should grater than 0");
    });
  });

  describe("出价功能", function () {
    beforeEach(async function () {
      await lhtNFT.mintNFT(deployer.address, "ipfs://test");
      await lhtAuction.createAuction(
        lhtNFT.address, 1, 3600, ethers.parseEther("0.1"), ethers.ZeroAddress
      );
    });

    it("应该能够出价", async function () {
      await expect(
        lhtAuction.connect(user1).placeBid(0, ethers.parseEther("0.2"), ethers.ZeroAddress, {
          value: ethers.parseEther("0.2")
        })
      ).to.not.be.reverted;

      const auctionInfo = await lhtAuction.getAuctionInfo(0);
      expect(auctionInfo.highestBidder).to.equal(user1.address);
      expect(auctionInfo.highestBid).to.equal(ethers.parseEther("0.2"));
    });

    it("应该验证出价金额", async function () {
      await expect(
        lhtAuction.connect(user1).placeBid(0, 0, ethers.ZeroAddress, {
          value: 0
        })
      ).to.be.revertedWith("Bid amount must be greater than 0");
    });

    it("应该验证代币类型一致性", async function () {
      await expect(
        lhtAuction.connect(user1).placeBid(0, ethers.parseEther("0.2"), user1.address, {
          value: ethers.parseEther("0.2")
        })
      ).to.be.revertedWith("Token type mismatch");
    });

    it("应该验证拍卖是否活跃", async function () {
      // 等待拍卖结束
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine");

      await expect(
        lhtAuction.connect(user1).placeBid(0, ethers.parseEther("0.2"), ethers.ZeroAddress, {
          value: ethers.parseEther("0.2")
        })
      ).to.be.revertedWith("auction has ended!");
    });
  });

  describe("结束拍卖", function () {
    beforeEach(async function () {
      await lhtNFT.mintNFT(deployer.address, "ipfs://test");
      await lhtAuction.createAuction(
        lhtNFT.address, 1, 3600, ethers.parseEther("0.1"), ethers.ZeroAddress
      );
    });

    it("应该能够结束拍卖", async function () {
      // 等待拍卖结束
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine");

      await expect(lhtAuction.endAuction(0)).to.not.be.reverted;

      const auctionInfo = await lhtAuction.getAuctionInfo(0);
      expect(auctionInfo.ended).to.be.true;
    });

    it("应该验证拍卖是否已结束", async function () {
      await expect(
        lhtAuction.endAuction(0)
      ).to.be.revertedWith("Auction has not ended");
    });
  });

  describe("查询功能", function () {
    beforeEach(async function () {
      await lhtNFT.mintNFT(deployer.address, "ipfs://test");
      await lhtAuction.createAuction(
        lhtNFT.address, 1, 3600, ethers.parseEther("0.1"), ethers.ZeroAddress
      );
    });

    it("应该正确返回拍卖信息", async function () {
      const auctionInfo = await lhtAuction.getAuctionInfo(0);
      expect(auctionInfo.nftContract).to.equal(lhtNFT.address);
      expect(auctionInfo.nftTokenId).to.equal(1);
      expect(auctionInfo.seller).to.equal(deployer.address);
    });

    it("应该正确检查拍卖是否活跃", async function () {
      expect(await lhtAuction.isAuctionActive(0)).to.be.true;

      // 等待拍卖结束
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine");

      expect(await lhtAuction.isAuctionActive(0)).to.be.false;
    });

    it("应该返回正确的版本信息", async function () {
      const version = await lhtAuction.getAuctionVersion();
      expect(version).to.equal("1.0");
    });
  });

  describe("暂停功能", function () {
    it("应该能够暂停和恢复合约", async function () {
      await lhtAuction.pause();
      expect(await lhtAuction.paused()).to.be.true;

      await lhtAuction.unpause();
      expect(await lhtAuction.paused()).to.be.false;
    });

    it("暂停时应该阻止操作", async function () {
      await lhtAuction.pause();
      await lhtNFT.mintNFT(deployer.address, "ipfs://test");

      await expect(
        lhtAuction.createAuction(
          lhtNFT.address, 1, 3600, ethers.parseEther("0.1"), ethers.ZeroAddress
        )
      ).to.be.revertedWith("Contract is paused");
    });
  });
});
