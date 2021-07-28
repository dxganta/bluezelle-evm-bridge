//SPDX-License-Identifier: GPL 3
pragma solidity ^0.8.0;

interface ICallerContract {
  function callbackOracle(uint256 latestPrice, uint256 id) external;
  function callbackDB(string calldata value, uint256 id) external;
}