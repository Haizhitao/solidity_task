module.exports = async function ({ getNamedAccounts, deployments, network }) {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  log("🚀 开始部署 LHT_Auction_Factory 实现合约...");

  const lhtAuctionFactoryImplementation = await deploy("LHT_Auction_Factory", {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: network.name === "hardhat" ? 1 : 6,
  });

  log(`✅ LHT_Auction_Factory 实现合约已部署到: ${lhtAuctionFactoryImplementation.address}`);

  // 验证合约
  if (lhtAuctionFactoryImplementation.newlyDeployed && network.name !== "hardhat" && network.name !== "localhost") {
    log("🔍 验证合约...");
    try {
      await run("verify:verify", {
        address: lhtAuctionFactoryImplementation.address,
        constructorArguments: [],
      });
      log("✅ 合约验证成功");
    } catch (error) {
      log("❌ 合约验证失败:", error.message);
    }
  }

  return lhtAuctionFactoryImplementation;
};

module.exports.tags = ["all", "LHT_Auction_Factory_Implementation"];
