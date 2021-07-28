//SPDX-License-Identifier: GPL 3
pragma solidity ^0.8.0;

interface IBluezelleOracle {
    function getOracleValue(string calldata pair1, string calldata pair2) external returns (uint id);
    function getDBValue(uint uuid, string calldata key) external returns (uint id);
}