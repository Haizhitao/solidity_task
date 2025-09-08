require("@nomicfoundation/hardhat-toolbox");
require("hardhat-deploy");
require("@openzeppelin/hardhat-upgrades");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
  },
  namedAccounts: {
    deployer: {
      default: 0, // 默认使用第一个账户作为部署者
    },
    seller: {
      default: 1, // 第二个账户作为卖家
    },
    bidder1: {
      default: 2, // 第三个账户作为出价者1
    },
    bidder2: {
      default: 3, // 第四个账户作为出价者2
    },
  },
  paths: {
    deployments: "deploy",
  },
};
