// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleERC20 {
    // 代币基本信息
    string public name;
    string public symbol;
    uint8 public decimals;
    
    // 代币总供应量
    uint256 public totalSupply;
    
    // 合约所有者
    address public owner;
    
    // 余额映射
    mapping(address => uint256) private _balances;
    
    // 授权额度映射
    mapping(address => mapping(address => uint256)) private _allowances;
    
    // 事件定义
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    // 构造函数
    constructor(string memory _name, string memory _symbol, uint8 _decimals, uint256 _initialSupply) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        owner = msg.sender;
        
        // 初始发行代币给合约创建者
        _mint(msg.sender, _initialSupply);
    }
    
    // 仅所有者修饰器
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    // 查询余额
    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }
    
    // 转账功能
    function transfer(address to, uint256 amount) public returns (bool) {
        require(to != address(0), "Transfer to the zero address");
        require(_balances[msg.sender] >= amount, "Insufficient balance");
        
        _balances[msg.sender] -= amount;
        _balances[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    // 授权功能
    function approve(address spender, uint256 amount) public returns (bool) {
        _allowances[msg.sender][spender] = amount;
        
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    // 查询授权额度
    function allowance(address _owner, address spender) public view returns (uint256) {
        return _allowances[_owner][spender];
    }
    
    // 代扣转账功能
    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        require(from != address(0), "Transfer from the zero address");
        require(to != address(0), "Transfer to the zero address");
        require(_balances[from] >= amount, "Insufficient balance");
        require(_allowances[from][msg.sender] >= amount, "Insufficient allowance");
        
        _balances[from] -= amount;
        _balances[to] += amount;
        _allowances[from][msg.sender] -= amount;
        
        emit Transfer(from, to, amount);
        return true;
    }
    
    // 增发代币（仅所有者可调用）
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
    
    // 内部增发函数
    function _mint(address account, uint256 amount) internal {
        require(account != address(0), "Mint to the zero address");
        
        totalSupply += amount;
        _balances[account] += amount;
        
        emit Transfer(address(0), account, amount);
    }
}