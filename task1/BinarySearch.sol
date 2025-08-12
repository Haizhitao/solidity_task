// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract BinarySearch {

    function search(int[] memory arr, int a) public pure returns(int) {
        require(arr.length > 0, "empty array");
        if (a < arr[0] || a > arr[arr.length -1]) {
            return -1;
        }

        uint start;
        uint end = arr.length;
        while (start < end) {
            uint mid = start + (end - start) / 2;
            if (arr[mid] == a) {
                return int(mid);
            } else if (arr[mid] < a) {
                start = mid + 1;
            } else {
                end = mid;
            }
        }

        return -1;
    }

}