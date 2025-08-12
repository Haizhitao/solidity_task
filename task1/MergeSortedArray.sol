// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MergeSortedArray {

    function merge(int[] memory a, int[] memory b) public pure returns (int[] memory) {
        uint alen = a.length;
        uint blen = b.length;
        require(alen > 0 && blen >0, unicode"有序数组不能为空");

        int[] memory result = new int[](alen + blen);
        uint i = 0;
        uint j = 0;
        uint k = 0;

        while (i < alen && j < blen) {
            if (a[i] < b[j]) {
                result[k++] = a[i++];
            } else {
                result[k++] = b[j++];
            }
        }

        while (i < alen) {
            result[k++] = a[i++];
        }

        while (j < blen) {
            result[k++] = b[j++];
        }

        return result;
    }
 }