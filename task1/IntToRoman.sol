// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract IntegerToRoman {
    struct RomanNumeral {
        uint256 value;
        string symbol;
    }
    
    RomanNumeral[] private romanNumerals;
    
    constructor() {
        romanNumerals.push(RomanNumeral(1000, "M"));
        romanNumerals.push(RomanNumeral(900, "CM"));
        romanNumerals.push(RomanNumeral(500, "D"));
        romanNumerals.push(RomanNumeral(400, "CD"));
        romanNumerals.push(RomanNumeral(100, "C"));
        romanNumerals.push(RomanNumeral(90, "XC"));
        romanNumerals.push(RomanNumeral(50, "L"));
        romanNumerals.push(RomanNumeral(40, "XL"));
        romanNumerals.push(RomanNumeral(10, "X"));
        romanNumerals.push(RomanNumeral(9, "IX"));
        romanNumerals.push(RomanNumeral(5, "V"));
        romanNumerals.push(RomanNumeral(4, "IV"));
        romanNumerals.push(RomanNumeral(1, "I"));
    }
    
    function intToRoman(uint256 num) public view returns (string memory) {
        require(num >= 1 && num <= 3999, unicode"数字超出范围");
        
        string memory result;
        uint256 remaining = num;
        
        for (uint256 i = 0; i < romanNumerals.length; i++) {
            while (remaining >= romanNumerals[i].value) {
                result = string(abi.encodePacked(result, romanNumerals[i].symbol));
                remaining -= romanNumerals[i].value;
            }
        }
        
        return result;
    }
}