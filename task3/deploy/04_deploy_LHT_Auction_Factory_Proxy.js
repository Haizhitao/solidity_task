const { ethers, upgrades, artifacts } = require("hardhat");

module.exports = async function ({ getNamedAccounts, deployments, network }) {
  const { log, get } = deployments;
  const { deployer } = await getNamedAccounts();

  log("🚀 开始部署 LHT_Auction_Factory 代理合约...");

  // 获取拍卖实现合约（用于初始化工厂合约）
  const lhtAuctionImplementation = await get("LHT_Auction");
  log(`📋 拍卖实现合约地址: ${lhtAuctionImplementation.address}`);

  // 使用 hardhat-upgrades 部署 Transparent 代理
  const Factory = await ethers.getContractFactory("LHT_Auction_Factory");
  const proxy = await upgrades.deployProxy(
    Factory,
    [lhtAuctionImplementation.address, deployer],
    { initializer: "initialize", kind: "transparent" }
  );
  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();

  log(`✅ LHT_Auction_Factory 代理合约已部署到: ${proxyAddress}`);

  // 验证合约
  // 使用 upgrades 部署的实现合约验证可选，通常验证实现合约地址。
  // 这里仅在需要时进行，默认跳过。
  if (network.name !== "hardhat" && network.name !== "localhost") {
    log("🔍 验证合约...");
    try {
      // 可在此处添加对实现合约地址的验证（需要先查询实现地址）
      log("ℹ️ 透明代理的实现合约验证可在需要时单独执行");
    } catch (error) {
      log("❌ 合约验证失败:", error.message);
    }
  }

  // 将代理地址保存到 hardhat-deploy 的 deployments 清单，方便其他脚本读取
  const implAbi = (await artifacts.readArtifact("LHT_Auction_Factory")).abi;
  await deployments.save("LHT_Auction_Factory_Proxy", {
    address: proxyAddress,
    abi: implAbi
  });

  return { address: proxyAddress };
};

module.exports.tags = ["all", "LHT_Auction_Factory_Proxy"];
module.exports.dependencies = ["LHT_Auction_Implementation"];
