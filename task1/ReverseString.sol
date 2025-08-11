// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ReverseString {

    function reverse(string memory _input) public pure returns(string memory) {
        bytes memory inputBytes = bytes(_input);
        uint256 length = inputBytes.length;

        if (length == 0) {
            return "";
        }

        bytes memory reverseBytes = new bytes(length);
        for (uint i = 0; i < length; i++) {
            reverseBytes[i] = inputBytes[length - (i + 1)];
        }
        return string(reverseBytes);
    }

}