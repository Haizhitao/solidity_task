const { ethers } = require("hardhat");

module.exports = async function ({ getNamedAccounts, deployments, getChainId }) {
  const { deploy, log, get } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = await getChainId();

  log("🚀 开始部署 LHT_Auction_Factory 代理合约...");

  // 获取已部署的实现合约
  const lhtAuctionFactoryImplementation = await get("LHT_Auction_Factory");
  const lhtAuctionImplementation = await get("LHT_Auction");

  log(`📋 使用实现合约地址: ${lhtAuctionFactoryImplementation.address}`);
  log(`📋 拍卖实现合约地址: ${lhtAuctionImplementation.address}`);

  // 部署代理合约
  const lhtAuctionFactoryProxy = await deploy("LHT_Auction_Factory_Proxy", {
    contract: "LHT_Auction_Factory",
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: chainId == "31337" ? 1 : 6,
    proxy: {
      owner: deployer,
      proxyContract: "OpenZeppelinTransparentProxy",
      viaAdminContract: {
        name: "LHT_Auction_Factory_ProxyAdmin",
        artifact: "ProxyAdmin",
      },
      execute: {
        init: {
          methodName: "initialize",
          args: [lhtAuctionImplementation.address, deployer]
        }
      }
    },
  });

  log(`✅ LHT_Auction_Factory 代理合约已部署到: ${lhtAuctionFactoryProxy.address}`);

  // 验证合约
  if (lhtAuctionFactoryProxy.newlyDeployed) {
    log("🔍 验证合约...");
    try {
      await run("verify:verify", {
        address: lhtAuctionFactoryProxy.address,
        constructorArguments: [],
      });
      log("✅ 合约验证成功");
    } catch (error) {
      log("❌ 合约验证失败:", error.message);
    }
  }

  return lhtAuctionFactoryProxy;
};

module.exports.tags = ["all", "LHT_Auction_Factory_Proxy"];
module.exports.dependencies = ["LHT_Auction_Factory_Implementation", "LHT_Auction_Implementation"];
