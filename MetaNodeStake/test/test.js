const { ethers, upgrades } = require("hardhat");
const { expect } = require("chai");

describe("MetaNodeStake测试", function () {
    let rewardToken; // RewardToken合约实例
    let metaNodeStake; // MetaNodeStake合约实例
    let owner; // 部署者账户
    let users; // 用户账户
    let startBlock; // 开始区块
    let endBlock; // 结束区块

    const REWARD_AMOUNT = ethers.parseEther("1000000"); // 奖励数量
    const META_NODE_PER_BLOCK = ethers.parseEther("1"); // 每个区块奖励数量
    const MIN_DEPOSIT = ethers.parseEther("0.01"); // 最小质押金额
    const UNSTAKE_LOCKED_BLOCKS = 100; // 解质押锁定区块数

    // 每个测试用例执行前执行
    beforeEach(async function () {
        [owner, addr1, addr2, admin] = await ethers.getSigners();

        // 部署RewardToken
        const RewardToken = await ethers.getContractFactory("RewardToken");
        rewardToken = await RewardToken.deploy();
        await rewardToken.waitForDeployment();

        // 部署MetaNodeStake
        const MetaNodeStake = await ethers.getContractFactory("MetaNodeStake");

        startBlock = await ethers.provider.getBlockNumber() + 10; //10个区块后开始
        endBlock = startBlock + 1000000;

        metaNodeStake = await upgrades.deployProxy( //UUPS代理部署
            MetaNodeStake,
            [await rewardToken.getAddress(), startBlock, endBlock, META_NODE_PER_BLOCK],
            { initializer: "initialize" }
        );
        await metaNodeStake.waitForDeployment();

        // 向MetaNodeStake转移奖励代币
        await rewardToken.transfer(await metaNodeStake.getAddress(), REWARD_AMOUNT);

        // 添加第一个池子
        await metaNodeStake.addPool(ethers.ZeroAddress, 1000, MIN_DEPOSIT, UNSTAKE_LOCKED_BLOCKS, false);
    });

    describe("测试部署和初始化", function () {
        it("是否正确设置MetaNode代币地址", async function () {
            //MetaNode() 是solidity自动为公共状态变量生成的getter方法
            expect(await metaNodeStake.MetaNode()).to.equal(await rewardToken.getAddress());
        });

        it("是否正确设置Stake属性", async function () {
            const currentStartBlock = await metaNodeStake.startBlock();
            const currentEndBlock = await metaNodeStake.endBlock();

            expect(currentStartBlock).to.be.greaterThan(0);
            expect(currentEndBlock).to.be.greaterThan(currentStartBlock);
            expect(await metaNodeStake.MetaNodePerBlock()).to.equal(ethers.parseEther("1"));
        });

        it("是否给部署者分配管理员角色", async function () {
            const ADMIN_ROLE = await metaNodeStake.ADMIN_ROLE();
            expect(await metaNodeStake.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
        });
    });

    describe("测试代币池", function () {
        it("是否成功添加ETH池", async function () {
            const poolLength = await metaNodeStake.poolLength();
            expect(poolLength).to.equal(1);

            const ethPool = await metaNodeStake.pool(0);
            expect(ethPool.stTokenAddress).to.equal(ethers.ZeroAddress);
            expect(ethPool.poolWeight).to.equal(1000);
            expect(ethPool.minDepositAmount).to.equal(MIN_DEPOSIT);
            expect(ethPool.unstakeLockedBlocks).to.equal(UNSTAKE_LOCKED_BLOCKS);
        });

        it("是否正确设置权重", async function () {
            await metaNodeStake.setPoolWeight(0, 1500, true);
            const pool = await metaNodeStake.pool(0);
            expect(pool.poolWeight).to.equal(1500);
        });

        it("是否正确更新池信息", async function () {
            await metaNodeStake.updatePool(0, ethers.parseEther("0.02"), 200);
            const pool = await metaNodeStake.pool(0);
            expect(pool.minDepositAmount).to.equal(ethers.parseEther("0.02"));
            expect(pool.unstakeLockedBlocks).to.equal(200);
        });

        it("是否拒绝添加无效的解质押锁定区块数", async function () {
            await expect(
                metaNodeStake.addPool(
                    addr1.address,
                    1000,
                    MIN_DEPOSIT,
                    0, // 无效的锁定区块数
                    false
                )
            ).to.be.revertedWith("invalid withdraw locked blocks");
        });
    });

    describe("测试ETH质押", function () {
        it("是否允许ETH质押", async function () {
            const stakeAmount = ethers.parseEther("0.1");

            await expect(metaNodeStake.connect(addr1).depositETH({ value: stakeAmount }))
                .to.emit(metaNodeStake, "Deposit")
                .withArgs(addr1.address, 0, stakeAmount);

            const userStakingBalance = await metaNodeStake.stakingBalance(0, addr1.address);
            expect(userStakingBalance).to.equal(stakeAmount);
        });

        it("是否拒绝低于最小金额的质押", async function () {
            const stakeAmount = ethers.parseEther("0.005"); // 低于最小金额
            await expect(
                metaNodeStake.connect(addr1).depositETH({ value: stakeAmount })
            ).to.be.revertedWith("deposit amount is too small");
        });

        it("是否正确计算待领取奖励", async function () {
            const stakeAmount = ethers.parseEther("0.1");

            // 先挖到开始区块
            const currentBlock = await ethers.provider.getBlockNumber();
            const startBlock = await metaNodeStake.startBlock();
            const blocksToMine = Number(startBlock) - Number(currentBlock) + 1;

            for (let i = 0; i < blocksToMine; i++) {
                await ethers.provider.send("evm_mine");
            }

            // 质押
            await metaNodeStake.connect(addr1).depositETH({ value: stakeAmount });

            // 再挖几个区块产生奖励
            for (let i = 0; i < 5; i++) {
                await ethers.provider.send("evm_mine");
            }

            const pendingReward = await metaNodeStake.pendingMetaNode(0, addr1.address);
            expect(pendingReward).to.be.greaterThan(0);
        });
    });

    describe("测试解质押", function () {
        beforeEach(async function () {
            // 先挖到开始区块
            const currentBlock = await ethers.provider.getBlockNumber();
            const startBlock = await metaNodeStake.startBlock();
            const blocksToMine = Number(startBlock) - Number(currentBlock) + 1;

            for (let i = 0; i < blocksToMine; i++) {
                await ethers.provider.send("evm_mine");
            }

            // 质押一些ETH
            const stakeAmount = ethers.parseEther("0.1");
            await metaNodeStake.connect(addr1).depositETH({ value: stakeAmount });
        });

        it("是否允许发起解质押请求", async function () {
            const unstakeAmount = ethers.parseEther("0.05");

            await expect(metaNodeStake.connect(addr1).unstake(0, unstakeAmount))
                .to.emit(metaNodeStake, "RequestUnstake") //验证合约发出了 RequestUnstake 事件
                .withArgs(addr1.address, 0, unstakeAmount);

            const userStakingBalance = await metaNodeStake.stakingBalance(0, addr1.address);
            expect(userStakingBalance).to.equal(ethers.parseEther("0.05"));
        });

        it("是否拒绝超出余额的解质押", async function () {
            const unstakeAmount = ethers.parseEther("0.2"); // 超出质押余额
            await expect(
                metaNodeStake.connect(addr1).unstake(0, unstakeAmount)
            ).to.be.revertedWith("Not enough staking token balance");
        });

        it("是否允许在锁定期后提取", async function () {
            const unstakeAmount = ethers.parseEther("0.05");
            // 发起解质押请求
            await metaNodeStake.connect(addr1).unstake(0, unstakeAmount);
            // 挖足够的区块来解锁
            for (let i = 0; i < UNSTAKE_LOCKED_BLOCKS + 1; i++) {
                await ethers.provider.send("evm_mine");
            }
            const initialBalance = await ethers.provider.getBalance(addr1.address);
            await expect(metaNodeStake.connect(addr1).withdraw(0))
                .to.emit(metaNodeStake, "Withdraw");
            const finalBalance = await ethers.provider.getBalance(addr1.address);
            expect(finalBalance).to.be.greaterThan(initialBalance);
        });

        it("是否拒绝在锁定期内提取", async function () {
            const unstakeAmount = ethers.parseEther("0.05");
            // 发起解质押请求
            await metaNodeStake.connect(addr1).unstake(0, unstakeAmount);
            // 只挖一半的锁定区块
            for (let i = 0; i < UNSTAKE_LOCKED_BLOCKS / 2; i++) {
                await ethers.provider.send("evm_mine");
            }
            // 尝试提取是否失败
            const tx = await metaNodeStake.connect(addr1).withdraw(0);
            const receipt = await tx.wait();
            // 检查是否有提取事件（是否没有提取金额）
            const withdrawEvent = receipt.logs.find(log => {
                try {
                    const parsed = metaNodeStake.interface.parseLog(log);
                    return parsed.name === "Withdraw";
                } catch (e) {
                    return false;
                }
            });
            if (withdrawEvent) {
                const parsed = metaNodeStake.interface.parseLog(withdrawEvent);
                expect(parsed.args.amount).to.equal(0);
            }
        });
    });

    describe("测试奖励领取", function () {
        beforeEach(async function () {
            // 质押一些ETH
            const stakeAmount = ethers.parseEther("0.1");
            await metaNodeStake.connect(addr1).depositETH({ value: stakeAmount });

            // 挖一些区块来产生奖励
            for (let i = 0; i < 10; i++) {
                await ethers.provider.send("evm_mine");
            }
        });

        it("是否允许领取奖励", async function () {
            const initialBalance = await rewardToken.balanceOf(addr1.address);

            await expect(metaNodeStake.connect(addr1).claim(0))
                .to.emit(metaNodeStake, "Claim");

            const finalBalance = await rewardToken.balanceOf(addr1.address);
            expect(finalBalance).to.be.greaterThan(initialBalance);
        });

        it("是否正确计算待领取奖励", async function () {
            const pendingReward = await metaNodeStake.pendingMetaNode(0, addr1.address);
            expect(pendingReward).to.be.greaterThan(0);
        });

        it("领取后待领取奖励是否清零", async function () {
            await metaNodeStake.connect(addr1).claim(0);

            const pendingReward = await metaNodeStake.pendingMetaNode(0, addr1.address);
            expect(pendingReward).to.equal(0);
        });
    });

    describe("测试奖励分配机制", function () {
        it("是否按质押比例分配奖励（同时质押）", async function () {
          // 先挖到开始区块
          const currentBlock = await ethers.provider.getBlockNumber();
          const startBlock = await metaNodeStake.startBlock();
          const blocksToMine = Number(startBlock) - Number(currentBlock) + 1;
          
          for (let i = 0; i < blocksToMine; i++) {
            await ethers.provider.send("evm_mine");
          }
          
          const stakeAmount1 = ethers.parseEther("0.1");
          const stakeAmount2 = ethers.parseEther("0.2");
          
          // 同时质押（避免时间差异）
          await metaNodeStake.connect(addr1).depositETH({ value: stakeAmount1 });
          await metaNodeStake.connect(addr2).depositETH({ value: stakeAmount2 });
          
          // 挖区块产生奖励
          for (let i = 0; i < 20; i++) {
            await ethers.provider.send("evm_mine");
          }
          
          // 领取奖励
          await metaNodeStake.connect(addr1).claim(0);
          await metaNodeStake.connect(addr2).claim(0);
          
          const reward1 = await rewardToken.balanceOf(addr1.address);
          const reward2 = await rewardToken.balanceOf(addr2.address);
          
          // 用户2质押更多，应该获得更多奖励
          expect(reward2).to.be.greaterThan(reward1);
          
          // 奖励比例应该大致符合质押比例
          const ratio = Number(reward2) / Number(reward1);
          expect(ratio).to.be.closeTo(2, 0.5); // 允许一定误差
        });
      });

    describe("测试管理员功能", function () {
        it("是否允许暂停和恢复质押", async function () {
            await expect(metaNodeStake.pauseWithdraw())
                .to.emit(metaNodeStake, "PauseWithdraw");

            expect(await metaNodeStake.withdrawPaused()).to.be.true;

            await expect(metaNodeStake.unpauseWithdraw())
                .to.emit(metaNodeStake, "UnpauseWithdraw");

            expect(await metaNodeStake.withdrawPaused()).to.be.false;
        });

        it("是否允许暂停和恢复领取", async function () {
            await expect(metaNodeStake.pauseClaim())
                .to.emit(metaNodeStake, "PauseClaim");

            expect(await metaNodeStake.claimPaused()).to.be.true;

            await expect(metaNodeStake.unpauseClaim())
                .to.emit(metaNodeStake, "UnpauseClaim");

            expect(await metaNodeStake.claimPaused()).to.be.false;
        });

        it("是否允许更新每区块奖励", async function () {
            const newRewardPerBlock = ethers.parseEther("2");

            await expect(metaNodeStake.setMetaNodePerBlock(newRewardPerBlock))
                .to.emit(metaNodeStake, "SetMetaNodePerBlock")
                .withArgs(newRewardPerBlock);

            expect(await metaNodeStake.MetaNodePerBlock()).to.equal(newRewardPerBlock);
        });

        it("是否拒绝非管理员调用管理员功能", async function () {
            await expect(
                metaNodeStake.connect(addr1).pauseWithdraw()
            ).to.be.revertedWithCustomError(metaNodeStake, "AccessControlUnauthorizedAccount");
        });
    });

    describe("测试边界情况", function () {
        it("是否处理零金额质押", async function () {
            await expect(
                metaNodeStake.connect(addr1).depositETH({ value: 0 })
            ).to.be.revertedWith("deposit amount is too small");
        });

        it("是否处理零金额解质押", async function () {
            const stakeAmount = ethers.parseEther("0.1");
            await metaNodeStake.connect(addr1).depositETH({ value: stakeAmount });

            await expect(
                metaNodeStake.connect(addr1).unstake(0, 0)
            ).to.emit(metaNodeStake, "RequestUnstake")
                .withArgs(addr1.address, 0, 0);
        });

        it("是否处理无效的池ID", async function () {
            // 测试使用不存在的池ID调用deposit函数
            await expect(
                metaNodeStake.connect(addr1).deposit(999, MIN_DEPOSIT) // 使用不存在的池ID
            ).to.be.revertedWith("invalid pid");
        });

    });

});