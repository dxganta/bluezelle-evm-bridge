//SPDX-License-Identifier: GPL 3
pragma solidity ^0.8.0;

import "./dependencies/Ownable.sol";
import "./interfaces/ICallerContract.sol";

// TODO:
// the strings that I have used are actually bytes32 values
// but the real values will be pretty small right, like "usdt" "btc", etc.
// so put a bytes___ (like bytes12 or maybe bytes8, etc.) value instead of string. figure out which one will be the best

// TODO:
// the owner must only be able to withdraw the amount that has been used by the callers

// TODO:
// add a fees too, during recharge & withdrawal

contract BluzelleOracle is Ownable {
  uint8 public constant decimals = 8;
  uint private randNonce = 0;
  uint private modulus = 10e10;
  mapping(uint=>bool) private pendingRequests;
  mapping(address=>uint) private _balances;
  uint private _unUsedBalance;

  event GetOracleValueEvent(address callerAddress, uint id, string pair1, string pair2);
  event GetDBValueEvent(address callerAddress, uint id, string uuid, string key);

  modifier requestExists(uint _id) {
        require(pendingRequests[_id], "Request not in pending list");
        _;
  }

  function balanceOf(address _account) public view returns (uint) {
    return _balances[_account];
  }

  function rechargeGas(address _for) public payable {
    _balances[_for] += msg.value;
    _unUsedBalance += msg.value;
  }

// a caller may call this function to withdraw the unused gas 
  function withdrawGas(address payable _to, uint _val) public payable {
    require(balanceOf(_to) >= _val, "Not enough balance");
    _balances[_to] -= _val; // no need safemath, since 0.8.0 does underflow checks by default
    _unUsedBalance -= _val;
    _to.transfer(_val);
  }

  // withdraws ether from the contracts balance to the owner, to be used by the ocw as gas
  // the owner will only be able to withdraw ether that has been used by the caller
  // this is so that, the caller may later withdraw the unused gas if he/she wants to
  function withdraw(uint _amount) external onlyOwner {
    uint maxAmount = _usedBalance(); // the owner can only withdraw the used balance
    require(_amount <= maxAmount);
    payable(owner()).transfer(_amount);
  }

  // withdraw all the used balance
  function withdrawAll() external onlyOwner {
    payable(owner()).transfer(_usedBalance());
  }

    // value for a price pair like BTC/USDT
  function getOracleValue(string calldata pair1, string calldata pair2) external returns (uint) {
      uint id = _updateRequest();
      emit GetOracleValueEvent(msg.sender, id, pair1, pair2);
      return id;
  }

    // value of a particular key for a particular database uuid
  function getDBValue(string calldata uuid, string calldata key) external returns (uint) {
      uint id = _updateRequest();
      emit GetDBValueEvent(msg.sender, id, uuid, key);
      return id;
  }

  function setOracleValue(uint _latestPrice, address _callerAddress, uint _id) external onlyOwner requestExists(_id) {
    delete pendingRequests[_id];

    // TODO: reduce the gasBalance of the callerAddress

    // TODO: reduce the un-used balance

    ICallerContract c = ICallerContract(_callerAddress);
    c.callbackOracle(_latestPrice, _id);
  }

  function setDBValue(string calldata _value, address _callerAddress, uint _id) external onlyOwner requestExists(_id) {
      delete pendingRequests[_id];

      // TODO: reduce the gasBalance of the callerAddress

      // TODO: reduce the un-used Balance

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

  function _usedBalance() internal view returns (uint) {
    return address(this).balance - _unUsedBalance;
  }

    receive() external payable {

    }
}