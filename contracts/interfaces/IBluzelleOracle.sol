//SPDX-License-Identifier: GPL 3
pragma solidity ^0.8.0;

interface IBluzelleOracle {
    function getOracleValue(string calldata pair1, string calldata pair2) external returns (uint id);
    function getDBValue(string calldata uuid, string calldata key) external returns (uint id);
}