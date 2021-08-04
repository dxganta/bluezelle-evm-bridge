//SPDX-License-Identifier: GPL 3
pragma solidity ^0.8.0;

import "./interfaces/IBluzelleOracle.sol";
import "./dependencies/Ownable.sol";
import "./interfaces/ICallerContract.sol";


/*
 This is just an example Caller Contract for the user's reference
 for interacting with the BluzelleOracle
 */

contract CallerContract is ICallerContract, Ownable {

    IBluzelleOracle private oracleInstance;
    address private oracleAddress;
    mapping(uint => bool) myRequests;
    uint public btcValue;
    string public dbValue;

    event OracleAddressUpdated(address oracleAddress);
    event ReceivedNewRequestId(uint id);
    event PriceUpdated(uint btcPrice, uint id);
    event DBValueUpdated(string value, uint id);

    modifier onlyOracle() {
        require(msg.sender == oracleAddress, "Not authorized");
    _;
    }

    modifier requestExists(uint id) {
        require(myRequests[id], "Not in pending list");
        _;
    }

    function setOracleAddress(address _oracle) public onlyOwner {
        oracleAddress = _oracle;
        oracleInstance = IBluzelleOracle(oracleAddress);
        emit OracleAddressUpdated(oracleAddress);
    }

    function rechargeOracle() public payable {
        // the account must have ether to recharge
        oracleInstance.rechargeGas{value: msg.value}(address(this));
    }

    function withdrawGas(address payable _to, uint _amount) public onlyOwner {
        oracleInstance.withdrawGas(_to, _amount);
    }

    // currently testing the value only for the btc/usd pair
    function updateBtcValue(uint _gasPrice) public {
        uint id = oracleInstance.getOracleValue("btc", "usd", _gasPrice);
        myRequests[id] = true;
        emit ReceivedNewRequestId(id);
    }

    function updateDBValue(string calldata uuid, string calldata key, uint gasPrice) public {
        uint id = oracleInstance.getDBValue(uuid, key, gasPrice);
        myRequests[id] = true;
        emit ReceivedNewRequestId(id);
    }

    function callbackOracle(uint latestPrice, uint id) public override onlyOracle requestExists(id) {
        btcValue = latestPrice;
        delete myRequests[id];
        emit PriceUpdated(latestPrice, id);
    }

    function callbackDB(string calldata value, uint id) public override onlyOracle requestExists(id) {
        dbValue = value;
        delete myRequests[id];
        emit DBValueUpdated(value, id);
    }

    receive() external payable {

    }
}
