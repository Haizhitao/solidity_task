const { ethers, upgrades } = require("hardhat");

async function main() {
  console.log("开始部署合约到Sepolia网络...");

  // 获取部署者账户
  const [deployer] = await ethers.getSigners();
  console.log("部署者地址:", deployer.address);
  console.log("部署者余额:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // 1. 部署 RewardToken 合约
  console.log("\n=== 部署 RewardToken 合约 ===");
  const RewardToken = await ethers.getContractFactory("RewardToken");
  const rewardToken = await RewardToken.deploy();
  await rewardToken.waitForDeployment();
  
  const rewardTokenAddress = await rewardToken.getAddress();
  console.log("RewardToken 合约地址:", rewardTokenAddress);

  // 2. 部署 MetaNodeStake 合约 (可升级合约)
  console.log("\n=== 部署 MetaNodeStake 合约 ===");
  const MetaNodeStake = await ethers.getContractFactory("MetaNodeStake");
  
  // 设置初始化参数
  const startBlock = await ethers.provider.getBlockNumber() + 10; // 10个区块后开始
  const endBlock = startBlock + 1000000; // 100万个区块后结束
  const metaNodePerBlock = ethers.parseEther("1"); // 每个区块1个MetaNode

  console.log("初始化参数:");
  console.log("- 开始区块:", startBlock);
  console.log("- 结束区块:", endBlock);
  console.log("- 每区块奖励:", ethers.formatEther(metaNodePerBlock), "MetaNode");

  const metaNodeStake = await upgrades.deployProxy(
    MetaNodeStake,
    [rewardTokenAddress, startBlock, endBlock, metaNodePerBlock],
    { initializer: "initialize" }
  );
  await metaNodeStake.waitForDeployment();

  const metaNodeStakeAddress = await metaNodeStake.getAddress();
  console.log("MetaNodeStake 代理合约地址:", metaNodeStakeAddress);

  // 3. 添加ETH质押池
  console.log("\n=== 添加ETH质押池 ===");
  const poolWeight = 1000; // 池权重
  const minDepositAmount = ethers.parseEther("0.001"); // 最小质押0.01 ETH
  const unstakeLockedBlocks = 10; // 锁定100个区块

  const addPoolTx = await metaNodeStake.addPool(
    ethers.ZeroAddress, // ETH池地址为0x0
    poolWeight,
    minDepositAmount,
    unstakeLockedBlocks,
    false // 不更新所有池
  );
  await addPoolTx.wait();
  console.log("ETH质押池添加成功");

  // 4. 向MetaNodeStake合约转移一些RewardToken作为奖励
  console.log("\n=== 转移奖励代币 ===");
  const rewardAmount = ethers.parseEther("1000000"); // 转移100万个RewardToken
  const transferTx = await rewardToken.transfer(metaNodeStakeAddress, rewardAmount);
  await transferTx.wait();
  console.log("已向MetaNodeStake合约转移", ethers.formatEther(rewardAmount), "个RewardToken");

  // 5. 输出部署信息
  console.log("\n=== 部署完成 ===");
  console.log("RewardToken 合约地址:", rewardTokenAddress);
  console.log("MetaNodeStake 代理合约地址:", metaNodeStakeAddress);
  console.log("ETH质押池ID: 0");
  console.log("池权重:", poolWeight);
  console.log("最小质押金额:", ethers.formatEther(minDepositAmount), "ETH");
  console.log("解质押锁定区块数:", unstakeLockedBlocks);

  // 6. 保存部署信息到文件
  const deploymentInfo = {
    network: "sepolia",
    deployer: deployer.address,
    rewardToken: {
      address: rewardTokenAddress,
      name: "RewardToken",
      symbol: "reward"
    },
    metaNodeStake: {
      proxyAddress: metaNodeStakeAddress,
      startBlock: startBlock,
      endBlock: endBlock,
      metaNodePerBlock: metaNodePerBlock.toString()
    },
    ethPool: {
      poolId: 0,
      weight: poolWeight,
      minDepositAmount: minDepositAmount.toString(),
      unstakeLockedBlocks: unstakeLockedBlocks
    },
    deploymentTime: new Date().toISOString()
  };

  const fs = require('fs');
  fs.writeFileSync('deployment-info.json', JSON.stringify(deploymentInfo, null, 2));
  console.log("\n部署信息已保存到 deployment-info.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("部署失败:", error);
    process.exit(1);
  });
