//SPDX-License-Identifier: GPL 3
pragma solidity ^0.8.0;

import "./dependencies/Ownable.sol";
import "./interfaces/ICallerContract.sol";


contract BluzelleOracle is Ownable {
  uint8 public constant decimals = 8;
  uint private randNonce = 0;
  uint private modulus = 10e10;
  mapping(uint=>bool) private pendingRequests;
  mapping(address=>uint) private _balances;
  uint public usedBalance;

  event GetOracleValueEvent(address callerAddress, uint id, string pair1, string pair2, uint gasPrice);
  event GetDBValueEvent(address callerAddress, uint id, string uuid, string key, uint gasPrice);

  modifier requestExists(uint _id) {
        require(pendingRequests[_id], "Request not in pending list");
        _;
  }

  function balanceOf(address _account) public view returns (uint) {
    return _balances[_account];
  }

  function rechargeGas(address _for) public payable {
    _balances[_for] += msg.value;
  }

// a caller may call this function to withdraw the unused gas 
  function withdrawGas(address payable _to,  uint _val) public {
    require(balanceOf(msg.sender) >= _val, "Not enough balance");
    _balances[msg.sender] -= _val; // no need safemath, since 0.8.0 does underflow checks by default
    _to.transfer(_val);
  }

  // withdraws ether from the contracts balance to the owner, to be used by the ocw as gas
  // the owner will only be able to withdraw ether that has been used by the callers
  // this is so that, the caller may later withdraw the unused gas if he/she wants to
  function withdraw(uint _amount) external onlyOwner {
   // the owner can only withdraw the used balance
    require(_amount <= usedBalance);
    usedBalance -= _amount;
    payable(owner()).transfer(_amount);
  }

  // withdraw all the used balance
  function withdrawAll() external onlyOwner {
    uint _amount = usedBalance;
    usedBalance = 0;
    payable(owner()).transfer(_amount);
  }

    // value for a price pair like BTC/USDT
  function getOracleValue(string calldata pair1, string calldata pair2, uint gasPrice) external returns (uint) {
      uint id = _updateRequest();
      emit GetOracleValueEvent(msg.sender, id, pair1, pair2, gasPrice);
      return id;
  }

    // value of a particular key for a particular database uuid
  function getDBValue(string calldata uuid, string calldata key, uint gasPrice) external returns (uint) {
      uint id = _updateRequest();
      emit GetDBValueEvent(msg.sender, id, uuid, key, gasPrice);
      return id;
  }

  function setOracleValue(uint _latestPrice, address _callerAddress, uint _id) external onlyOwner requestExists(_id) {
    _updateBalance(gasleft() * tx.gasprice, _callerAddress);

    delete pendingRequests[_id];

    ICallerContract c = ICallerContract(_callerAddress);
    c.callbackOracle(_latestPrice, _id);
  }

  function setDBValue(string calldata _value, address _callerAddress, uint _id) external onlyOwner requestExists(_id) {
      _updateBalance(gasleft() * tx.gasprice, _callerAddress);

      delete pendingRequests[_id];

      ICallerContract c = ICallerContract(_callerAddress);
      c.callbackDB(_value, _id);
  }


  // Private Functions

  function _updateBalance(uint _gas, address _callerAddress) internal {
     // reduce the gasBalance of the callerAddress
     _balances[_callerAddress] -= _gas;
     // increase the used balance
     usedBalance += _gas;
  }

    function _updateRequest() internal returns (uint) {
        randNonce++;
        uint id = uint(keccak256(abi.encodePacked(block.timestamp, msg.sender, randNonce))) % modulus;
        pendingRequests[id] = true;
        return id;
    }

    receive() external payable {

    }
}