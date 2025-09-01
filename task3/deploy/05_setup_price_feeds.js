const { ethers } = require("hardhat");

module.exports = async function ({ getNamedAccounts, deployments, getChainId }) {
  const { log, get } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = await getChainId();

  log("🚀 开始设置价格预言机...");

  // 获取已部署的工厂合约
  const lhtAuctionFactoryProxy = await get("LHT_Auction_Factory_Proxy");
  const factoryContract = await ethers.getContractAt("LHT_Auction_Factory", lhtAuctionFactoryProxy.address);

  // Sepolia 测试网的价格预言机地址
  const priceFeeds = {
    // ETH/USD
    "0x0000000000000000000000000000000000000000": "0x694AA1769357215DE4FAC081bf1f309aDC325306",
    // USDC/USD
    "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238": "0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E",
    // USDT/USD
    "0x7169D38820dfd117C3FA1f22a697dBA58d90BA06": "0x7169D38820dfd117C3FA1f22a697dBA58d90BA06",
  };

  // 本地网络使用模拟价格
  if (chainId == "31337") {
    log("🔧 本地网络，跳过价格预言机设置");
    return;
  }

  // 设置价格预言机
  for (const [tokenAddress, priceFeedAddress] of Object.entries(priceFeeds)) {
    try {
      log(`📊 设置 ${tokenAddress} 的价格预言机: ${priceFeedAddress}`);
      
      const tx = await factoryContract.setPriceFeed(tokenAddress, priceFeedAddress);
      await tx.wait();
      
      log(`✅ ${tokenAddress} 价格预言机设置成功`);
    } catch (error) {
      log(`❌ ${tokenAddress} 价格预言机设置失败:`, error.message);
    }
  }

  log("🎉 价格预言机设置完成");
};

module.exports.tags = ["all", "setup_price_feeds"];
module.exports.dependencies = ["LHT_Auction_Factory_Proxy"];
