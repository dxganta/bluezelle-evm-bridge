//SPDX-License-Identifier: GPL 3
pragma solidity ^0.8.0;

import "./dependencies/Ownable.sol";
import "./interfaces/ICallerContract.sol";

// TODO:
// the strings that I have used are actually bytes32 values
// but the real values will be pretty small right, like "usdt" "btc", etc.
// so put a bytes___ (like bytes12 or maybe bytes8, etc.) value instead of string. figure out which one will be the best

contract BluezelleOracle is Ownable {
  uint private randNonce = 0;
  uint private modulus = 10e10;
  mapping(uint256=>bool) pendingRequests;

  event GetOracleValueEvent(address callerAddress, uint id, string pair1, string pair2);
  event GetDBValueEvent(address callerAddress, uint id, uint uuid, string key);

  modifier requestExists(uint _id) {
        require(pendingRequests[_id], "Request not in pending list");
        _;
  }

    // value for a price pair like BTC/USDT
  function getOracleValue(string calldata pair1, string calldata pair2) external returns (uint) {
      uint id = _updateRequest();
      emit GetOracleValueEvent(msg.sender, id, pair1, pair2);
      return id;
  }

    // value of a particular key for a particular database uuid
  function getDBValue(uint uuid, string calldata key) external returns (uint) {
      uint id = _updateRequest();
      emit GetDBValueEvent(msg.sender, id, uuid, key);
      return id;
  }

  function setOracleValue(uint _latestPrice, address _callerAddress, uint _id) external onlyOwner requestExists(_id) {
      delete pendingRequests[_id];

    ICallerContract c = ICallerContract(_callerAddress);
    c.callbackOracle(_latestPrice, _id);
  }

  function setDBValue(string calldata _value, address _callerAddress, uint _id) external onlyOwner requestExists(_id) {
      delete pendingRequests[_id];

      ICallerContract c = ICallerContract(_callerAddress);
      c.callbackDB(_value, _id);
  }


  // Private Functions

    function _updateRequest() internal returns (uint) {
        randNonce++;
        uint id = uint(keccak256(abi.encodePacked(block.timestamp, msg.sender, randNonce))) % modulus;
        pendingRequests[id] = true;
        return id;
    }
}