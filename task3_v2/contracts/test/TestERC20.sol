// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * 测试用的ERC20代币合约
 * 用于NFT拍卖系统的测试
 */
contract TestERC20 is ERC20 {
    uint8 private _decimals;

    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) ERC20(name, symbol) {
        _decimals = 18;
        _mint(msg.sender, initialSupply);
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    // 用于测试的铸造函数
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    // 用于测试的销毁函数
    function burn(address from, uint256 amount) public {
        _burn(from, amount);
    }
}
