module.exports = async function ({ getNamedAccounts, deployments, network }) {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  log("🚀 开始部署 LHT_Auction 实现合约...");

  const lhtAuctionImplementation = await deploy("LHT_Auction", {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: network.name === "hardhat" ? 1 : 6,
  });

  log(`✅ LHT_Auction 实现合约已部署到: ${lhtAuctionImplementation.address}`);

  // 验证合约
  if (lhtAuctionImplementation.newlyDeployed && network.name !== "hardhat" && network.name !== "localhost") {
    log("🔍 验证合约...");
    try {
      await run("verify:verify", {
        address: lhtAuctionImplementation.address,
        constructorArguments: [],
      });
      log("✅ 合约验证成功");
    } catch (error) {
      log("❌ 合约验证失败:", error.message);
    }
  }

  return lhtAuctionImplementation;
};

module.exports.tags = ["all", "LHT_Auction_Implementation"];
