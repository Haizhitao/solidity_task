const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * 从cache目录读取合约地址
 */
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

/**
 * 保存合约地址到cache目录
 */
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
 * 合约升级脚本
 * 升级NftAuctionFactory和NftAuctionBeacon到V2版本
 */
async function main() {
  console.log("开始升级合约...");

  // 获取部署者账户
  const [deployer] = await ethers.getSigners();
  console.log("部署者地址:", deployer.address);

  // 从cache目录读取合约地址
  let factoryProxyAddress, beaconAddress;
  
  try {
    factoryProxyAddress = readContractAddress("NftAuctionFactory");
    beaconAddress = readContractAddress("NftAuctionBeacon");
  } catch (error) {
    console.error("读取合约地址失败:", error.message);
    console.log("请先运行部署脚本生成合约地址缓存");
    process.exit(1);
  }

  console.log("Factory代理地址:", factoryProxyAddress);
  console.log("Beacon地址:", beaconAddress);

  // 升级NftAuctionBeacon
  console.log("\n=== 升级NftAuctionBeacon ===");
  
  // 部署新的NftAuctionV2实现合约
  const NftAuctionV2 = await ethers.getContractFactory("NftAuctionV2");
  const nftAuctionV2Impl = await NftAuctionV2.deploy();
  await nftAuctionV2Impl.waitForDeployment();
  const nftAuctionV2Address = await nftAuctionV2Impl.getAddress();
  console.log("NftAuctionV2实现合约地址:", nftAuctionV2Address);

  // 升级Beacon
  const beacon = await ethers.getContractAt("NftAuctionBeacon", beaconAddress);
  const upgradeTx = await beacon.upgradeTo(nftAuctionV2Address);
  await upgradeTx.wait();
  console.log("Beacon升级交易哈希:", upgradeTx.hash);

  // 验证Beacon升级
  const newImplementation = await beacon.implementation();
  console.log("新的实现合约地址:", newImplementation);
  console.log("升级成功:", newImplementation.toLowerCase() === nftAuctionV2Address.toLowerCase());

  // 升级NftAuctionFactory
  console.log("\n=== 升级NftAuctionFactory ===");
  
  // 部署新的NftAuctionFactoryV2实现合约
  const NftAuctionFactoryV2 = await ethers.getContractFactory("NftAuctionFactoryV2");
  
  // 升级代理合约
  const upgradedFactory = await upgrades.upgradeProxy(factoryProxyAddress, NftAuctionFactoryV2);
  await upgradedFactory.waitForDeployment();
  
  const newFactoryImplAddress = await upgrades.erc1967.getImplementationAddress(factoryProxyAddress);
  console.log("Factory新的实现合约地址:", newFactoryImplAddress);

  // 验证升级
  console.log("\n=== 验证升级结果 ===");
  
  // 测试Beacon升级
  const factory = await ethers.getContractAt("NftAuctionFactoryV2", factoryProxyAddress);
  const beaconFromFactory = await factory.auctionBeacon();
  console.log("Factory中的Beacon地址:", beaconFromFactory);

  // 测试Factory升级 - 调用V2版本的新函数
  try {
    const [version, implementation] = await factory.getFactoryVersion();
    console.log("Factory版本:", version);
    console.log("Factory实现地址:", implementation);
  } catch (error) {
    console.log("Factory升级验证失败:", error.message);
  }

  // 保存升级信息
  const upgradeInfo = {
    upgradeType: "contract_upgrade",
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    network: await deployer.provider.getNetwork(),
    upgrades: {
      beacon: {
        oldImplementation: await beacon.implementation(),
        newImplementation: nftAuctionV2Address,
        upgradeTxHash: upgradeTx.hash
      },
      factory: {
        proxyAddress: factoryProxyAddress,
        newImplementation: newFactoryImplAddress
      }
    }
  };

  console.log("\n合约升级完成!");
  console.log("升级信息:", JSON.stringify(upgradeInfo, null, 2));

  return upgradeInfo;
}

// 如果直接运行此脚本
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("升级失败:", error);
      process.exit(1);
    });
}

module.exports = main;
