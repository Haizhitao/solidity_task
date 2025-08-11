// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Voting {
    //候选人=》得票数 map
    mapping(address addr => uint256 voteCount) public votes;
    //投票人=》是否投过票
    mapping(address addr => bool isVoted) public hasVoted;
    //候选人数组
    address[] public candidates;
    //投票人数组
    address[] public voters;

    function vote(address candidate) public {
        require(!hasVoted[msg.sender], unicode"已投过票");
        hasVoted[msg.sender] = true;
        voters.push(msg.sender);

        if (votes[candidate] == 0) {
            candidates.push(candidate);
        }
        votes[candidate]++;
    }

    function getVoteCount(address candidate) public view returns (uint256 voteCount) {
        return votes[candidate];
    }

    function resetVotes() public {
        //清空候选人
         for (uint i = 0; i < candidates.length; i++) {
            votes[candidates[i]] = 0;
         }
         delete candidates;

        //清空投票记录
        for (uint i = 0; i < voters.length; i++) {
            hasVoted[voters[i]] = false;
        }
        delete voters;
    }

}