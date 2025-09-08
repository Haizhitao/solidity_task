const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

//保存合约地址到cache目录
function saveContractAddress(contractName, address) {
  const cacheDir = path.join(__dirname, "..", "cache");
  
  // 确保cache目录存在
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  
  const addressFile = path.join(cacheDir, `${contractName}_address.txt`);
  fs.writeFileSync(addressFile, address);
  console.log(`保存${contractName}地址到cache:`, address);
}

/**
 * NFT合约部署脚本
 * 部署LHT_NFT合约，用于拍卖系统中的NFT资产
 */
async function main() {
  console.log("开始部署NFT合约...");

  // 获取部署者账户
  const [deployer] = await ethers.getSigners();
  console.log("部署者地址:", deployer.address);

  // 部署NFT合约
  const Nft = await ethers.getContractFactory("Nft");
  const nft = await Nft.deploy();
  await nft.waitForDeployment();

  const nftAddress = await nft.getAddress();
  console.log("NFT合约地址:", nftAddress);

  // 验证部署
  const name = await nft.name();
  const symbol = await nft.symbol();
  const owner = await nft.owner();
  
  console.log("NFT合约信息:");
  console.log("- 名称:", name);
  console.log("- 符号:", symbol);
  console.log("- 所有者:", owner);

  // 保存部署信息
  const deploymentInfo = {
    contractName: "Nft",
    address: nftAddress,
    deployer: deployer.address,
    transactionHash: nft.deploymentTransaction().hash,
    blockNumber: await deployer.provider.getBlockNumber(),
    timestamp: new Date().toISOString(),
    network: await deployer.provider.getNetwork(),
    contractInfo: {
      name,
      symbol,
      owner
    }
  };

  // 保存合约地址到cache
  saveContractAddress("Nft", nftAddress);

  console.log("NFT合约部署完成!");
  console.log("部署信息:", JSON.stringify(deploymentInfo, null, 2));

  return nftAddress;
}

// 如果直接运行此脚本
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("部署失败:", error);
      process.exit(1);
    });
}

module.exports = main;
