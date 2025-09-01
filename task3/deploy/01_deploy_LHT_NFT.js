const { ethers } = require("hardhat");

module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  log("🚀 开始部署 LHT_NFT 合约...");

  const lhtNFT = await deploy("LHT_NFT", {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: 1,
  });

  log(`✅ LHT_NFT 合约已部署到: ${lhtNFT.address}`);

  // 验证合约
  if (lhtNFT.newlyDeployed) {
    log("⏳ 等待区块确认...");
    await lhtNFT.waitForDeployment();
    
    log("🔍 验证合约...");
    try {
      await run("verify:verify", {
        address: lhtNFT.address,
        constructorArguments: [],
      });
      log("✅ 合约验证成功");
    } catch (error) {
      log("❌ 合约验证失败:", error.message);
    }
  }

  return lhtNFT;
};

module.exports.tags = ["all", "LHT_NFT"];
