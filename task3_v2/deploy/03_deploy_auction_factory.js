const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

//从cache目录读取合约地址
function readContractAddress(contractName) {
  const cacheDir = path.join(__dirname, "..", "cache");
  const addressFile = path.join(cacheDir, `${contractName}_address.txt`);
  
  if (!fs.existsSync(addressFile)) {
    throw new Error(`找不到合约地址文件: ${addressFile}`);
  }
  
  const address = fs.readFileSync(addressFile, "utf8").trim();
  console.log(`从cache读取${contractName}地址:`, address);
  return address;
}

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
 * NftAuctionFactory部署脚本
 * 使用UUPS代理模式部署可升级的工厂合约
 */
async function main() {
  console.log("开始部署NftAuctionFactory合约...");

  // 获取部署者账户
  const [deployer] = await ethers.getSigners();
  console.log("部署者地址:", deployer.address);

  // 从cache目录读取Beacon合约地址
  let beaconAddress;
  try {
    beaconAddress = readContractAddress("NftAuctionBeacon");
  } catch (error) {
    console.error("读取Beacon地址失败:", error.message);
    console.log("请先运行02_deploy_auction_beacon.js部署Beacon合约");
    process.exit(1);
  }

  // 部署NftAuctionFactory实现合约
  console.log("部署NftAuctionFactory实现合约...");
  const NftAuctionFactory = await ethers.getContractFactory("NftAuctionFactory");
  
  // 使用UUPS代理模式部署
  const factory = await upgrades.deployProxy(
    NftAuctionFactory,
    [beaconAddress],
    {
      initializer: "initialize",
      kind: "uups"
    }
  );
  
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("NftAuctionFactory代理合约地址:", factoryAddress);

  // 获取实现合约地址
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(factoryAddress);
  console.log("NftAuctionFactory实现合约地址:", implementationAddress);

  // 验证部署
  const owner = await factory.owner();
  const beacon = await factory.auctionBeacon();
  
  console.log("Factory合约信息:");
  console.log("- 所有者:", owner);
  console.log("- Beacon地址:", beacon);
  console.log("- Beacon地址匹配:", beacon.toLowerCase() === beaconAddress.toLowerCase());

  // 测试工厂功能
  console.log("测试工厂功能...");
  const auctionCount = await factory.getAuctionCount();
  console.log("- 当前拍卖数量:", auctionCount.toString());

  // 保存部署信息
  const deploymentInfo = {
    contractName: "NftAuctionFactory",
    proxyAddress: factoryAddress,
    implementationAddress: implementationAddress,
    beaconAddress: beaconAddress,
    deployer: deployer.address,
    transactionHash: factory.deploymentTransaction().hash,
    blockNumber: await deployer.provider.getBlockNumber(),
    timestamp: new Date().toISOString(),
    network: await deployer.provider.getNetwork(),
    contractInfo: {
      owner,
      beacon,
      auctionCount: auctionCount.toString()
    }
  };

  // 保存合约地址到cache
  saveContractAddress("NftAuctionFactory", factoryAddress);

  console.log("NftAuctionFactory合约部署完成!");
  console.log("部署信息:", JSON.stringify(deploymentInfo, null, 2));

  return {
    factoryAddress,
    implementationAddress,
    beaconAddress
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
