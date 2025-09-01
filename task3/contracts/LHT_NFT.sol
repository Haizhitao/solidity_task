// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract LHT_NFT is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    constructor() ERC721("LHT_NFT", "LHT") Ownable(msg.sender) {}

    //保障每个元数据只能铸造一个NFT
    mapping(string => bool) private _tokenURIExists;
    modifier onlyUniqueTokenURI(string memory metadataURI) {
        require(!_tokenURIExists[metadataURI], "Token URI already exists");
        _;
    }

    //铸造NFT
    function mintNFT(address recipient, string memory metadataURI) public onlyOwner onlyUniqueTokenURI(metadataURI) returns (uint256) {
        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();
        _mint(recipient, tokenId);
        _tokenURIExists[metadataURI] = true;
        _setTokenURI(tokenId, metadataURI);
        return tokenId;
    }

    // 重写 ERC721URIStorage 必要的函数
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}