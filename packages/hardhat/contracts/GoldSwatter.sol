// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GoldSwatter is ERC721, Ownable {
    uint256 private _nextTokenId;
    uint256 public constant MAX_SUPPLY = 1000;
    string public baseTokenURI;

    constructor(string memory _baseTokenURI) ERC721("Gold Swatter", "GSWT") Ownable(msg.sender) {
        baseTokenURI = _baseTokenURI;
    }

    function mint() public {
        require(_nextTokenId < MAX_SUPPLY, "Max supply reached");
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
}
