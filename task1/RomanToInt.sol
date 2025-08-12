// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract RomanToInt {

    mapping (bytes1 => uint num) public map;

    constructor() {
        map["I"] = 1;
        map["V"] = 5;
        map["X"] = 10;
        map["L"] = 50;
        map["C"] = 100;
        map["D"] = 500;
        map["M"] = 1000;
    }

    function convers(string memory _input) public view returns(int) {
        bytes memory inputBytes = bytes(_input);
        uint length = inputBytes.length;
        require(length >= 1 && length <= 15, unicode"无效字符串1");
        int result = 0;
        for (uint i = 0; i < length; i++) {
            int current = int(map[inputBytes[i]]);
            require(current != 0, unicode"无效字符串2");
            if (i == length -1 || current >= int(map[inputBytes[i+1]])) {
                result += int(current);
            } else {
                result -= int(current);
            }
        }
        return result;
    }
}