// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// 导入 OpenZeppelin v5.4.0 的 ERC721 实现
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
合约已部署，已铸造铸造 NFT: nft地址：https://sepolia.etherscan.io/nft/0x605657e78e2e4347f102abda018c73b12481c600/1
*/
contract MyNFT is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    // 限制每个元数据只能铸造一次：
    mapping(string => bool) private _isURIMinted;

    // 构造函数：设置 NFT 名称和符号
    constructor() ERC721("MyAwesomeNFT", "MANFT") Ownable(msg.sender) {}

    // mintNFT 函数：允许用户铸造 NFT
    // 将参数名从 tokenURI 改为 metadataURI 以避免命名冲突
    function mintNFT(address recipient, string memory metadataURI) public onlyOwner returns (uint256) {
        require(!_isURIMinted[metadataURI], "Content already minted");
        // 获取当前 tokenId 并递增
        _tokenIdCounter.increment();
        uint256 newTokenId = _tokenIdCounter.current();

        // 铸造 NFT
        _safeMint(recipient, newTokenId);
        
        // 设置 tokenURI (在 ERC721URIStorage 中)
        _setTokenURI(newTokenId, metadataURI);
        _isURIMinted[metadataURI] = true;

        return newTokenId;
    }

    // 获取当前总供应量
    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter.current();
    }

    // 重写 tokenURI 函数 (必须的覆盖)
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    // 重写 supportsInterface 函数 (必须的覆盖)
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // 可选：批量铸造功能
    function batchMint(address[] memory recipients, string[] memory metadataURIs) public onlyOwner {
        require(recipients.length == metadataURIs.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            mintNFT(recipients[i], metadataURIs[i]);
        }
    }
}