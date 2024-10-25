// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GoldSwatter is ERC721, Ownable {
    uint256 private _nextTokenId;
    uint256 public constant MAX_SUPPLY = 1000;
    string public baseTokenURI;
    uint256 public constant MINT_PRICE = 0.001 ether;

    constructor(string memory _baseTokenURI) ERC721("Gold Swatter", "GSWT") Ownable(msg.sender) {
        baseTokenURI = _baseTokenURI;
    }

    function mint() public payable {
        require(_nextTokenId < MAX_SUPPLY, "Max supply reached");
        require(msg.value >= MINT_PRICE, "Insufficient payment");
        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
    }

    function _baseURI() internal view override returns (string memory) {
        return baseTokenURI;
    }

    function setBaseURI(string memory _newBaseURI) public onlyOwner {
        baseTokenURI = _newBaseURI;
    }

    function totalSupply() public view returns (uint256) {
        return _nextTokenId;
    }

    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        payable(owner()).transfer(balance);
    }
}
