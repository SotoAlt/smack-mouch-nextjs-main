// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract GameScore {
    struct Score {
        address player;
        uint256 score;
    }

    Score[] public topScores;
    uint256 public constant MAX_TOP_SCORES = 10;

    mapping(address => uint256) public playerHighScores;

    event NewHighScore(address player, uint256 score);

    function setHighScore(uint256 score) external {
        if (score > playerHighScores[msg.sender]) {
            playerHighScores[msg.sender] = score;
            emit NewHighScore(msg.sender, score);
            _updateTopScores(msg.sender, score);
        }
    }

    function getHighScore(address player) external view returns (uint256) {
        return playerHighScores[player];
    }

    function getTopScores() external view returns (Score[] memory) {
        return topScores;
    }

    function _updateTopScores(address player, uint256 score) internal {
        uint256 index = topScores.length;
        for (uint256 i = 0; i < topScores.length; i++) {
            if (score > topScores[i].score) {
                index = i;
                break;
            }
        }

        if (index < MAX_TOP_SCORES) {
            if (topScores.length < MAX_TOP_SCORES) {
                topScores.push(Score(player, score));
            } else {
                for (uint256 i = MAX_TOP_SCORES - 1; i > index; i--) {
                    topScores[i] = topScores[i - 1];
                }
                topScores[index] = Score(player, score);
            }
        }
    }
}
