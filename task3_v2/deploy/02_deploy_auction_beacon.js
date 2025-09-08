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
 * NftAuctionBeacon部署脚本
 * 部署可升级的Beacon合约，用于管理NftAuction合约的升级
 */
async function main() {
  console.log("开始部署NftAuctionBeacon合约...");

  // 获取部署者账户
  const [deployer] = await ethers.getSigners();
  console.log("部署者地址:", deployer.address);

  // 首先部署NftAuction实现合约
  console.log("部署NftAuction实现合约...");
  const NftAuction = await ethers.getContractFactory("NftAuction");
  const nftAuctionImpl = await NftAuction.deploy();
  await nftAuctionImpl.waitForDeployment();
  
  const nftAuctionImplAddress = await nftAuctionImpl.getAddress();
  console.log("NftAuction实现合约地址:", nftAuctionImplAddress);

  // 部署NftAuctionBeacon合约
  console.log("部署NftAuctionBeacon合约...");
  const NftAuctionBeacon = await ethers.getContractFactory("NftAuctionBeacon");
  const beacon = await NftAuctionBeacon.deploy(nftAuctionImplAddress);
  await beacon.waitForDeployment();

  const beaconAddress = await beacon.getAddress();
  console.log("NftAuctionBeacon合约地址:", beaconAddress);

  // 验证部署
  const implementation = await beacon.implementation();
  const owner = await beacon.owner();
  
  console.log("Beacon合约信息:");
  console.log("- 实现合约地址:", implementation);
  console.log("- 所有者:", owner);
  console.log("- 实现合约地址匹配:", implementation.toLowerCase() === nftAuctionImplAddress.toLowerCase());

  // 保存部署信息
  const deploymentInfo = {
    contractName: "NftAuctionBeacon",
    address: beaconAddress,
    implementationAddress: nftAuctionImplAddress,
    deployer: deployer.address,
    transactionHash: beacon.deploymentTransaction().hash,
    blockNumber: await deployer.provider.getBlockNumber(),
    timestamp: new Date().toISOString(),
    network: await deployer.provider.getNetwork(),
    contractInfo: {
      implementation,
      owner
    }
  };

  // 保存合约地址到cache
  saveContractAddress("NftAuctionBeacon", beaconAddress);
  saveContractAddress("NftAuction", nftAuctionImplAddress);

  console.log("NftAuctionBeacon合约部署完成!");
  console.log("部署信息:", JSON.stringify(deploymentInfo, null, 2));

  return {
    beaconAddress,
    implementationAddress: nftAuctionImplAddress
  };
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
