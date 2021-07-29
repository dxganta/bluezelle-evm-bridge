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

    // currently testing the value only for the btc/usd pair
    function updateBtcValue() public {
        uint id = oracleInstance.getOracleValue("btc", "usd");
        myRequests[id] = true;
        emit ReceivedNewRequestId(id);
    }

    function updateDBValue(uint uuid, string calldata key) public {
        uint id = oracleInstance.getDBValue(uuid, key);
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
}
