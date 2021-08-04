//SPDX-License-Identifier: GPL 3
pragma solidity ^0.8.0;

interface IBluzelleOracle {
    function getOracleValue(string calldata pair1, string calldata pair2, uint gasPrice) external returns (uint id);
    function getDBValue(string calldata uuid, string calldata key, uint gasPrice) external returns (uint id);
    function withdrawGas(address payable _to, uint _val) external payable;
    function rechargeGas(address _for) external payable;
}