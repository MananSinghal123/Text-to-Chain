//SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {console} from "forge-std/console.sol";

contract USDC {
    function balanceOf(address account) external view returns (uint256) {
        console.log("Called balanceOf for account:", account);
        // Mock balance for testing purposes
        return 1_000_000 * 1e6; // 1 million USDC with 6 decimals
    }
}
