# Bluzelle Off Chain Worker

## Summary
This project consists of 2 primary parts:
1. <strong>[Oracle Contract](https://github.com/realdiganta/bluezelle-evm-bridge/blob/main/contracts/BluzelleOracle.sol)</strong><br>
The Oracle Contract, deployed to the evm, is the primary contract that smart contracts in the evm will interact with to get bluzelle's oracle & db values.
2. <strong>[OracleWorker](https://github.com/realdiganta/bluezelle-evm-bridge/blob/main/ocw/OracleWorker.js), [DBWorker](https://github.com/realdiganta/bluezelle-evm-bridge/blob/main/ocw/DBWorker.js)</strong><br>
Due to the single threaded nature of javascript, two separate workers have been created each for the Oracle Values & DB Values respectively.
3. <strong>[Caller Contract](https://github.com/realdiganta/bluezelle-evm-bridge/blob/main/contracts/CallerContract.sol) (optional)</strong><br>
This is just a demo caller contract which has been added for testing & for reference by any user who wants to deploy his own caller contract to interact with the Bluzelle Oracle Contract. One important point is, any caller contract must inherit from the [ICallerContract](https://github.com/realdiganta/bluezelle-evm-bridge/blob/main/contracts/interfaces/ICallerContract.sol) interface.

## Documentation

### BluzelleOracle.sol

Whenever, the worker posts a reply back for a request, it has to spend some gas. Now this gas has to be paid by the caller who posted the request. To keep track of this, a gas storing & recharging mechanism has been implemented in the oracle smart contract. Instead of the caller sending some ether as gas everytime to the oracle whenever he/she makes a request, the caller has to instead recharge the oracle with ether just once by calling a separate function. <br>
The oracle contract keeps track of the ether balance of a caller. Whenever, the worker posts the reply for a request back, it first checks if the caller has enough ether balance to pay as gas, if yes, then it posts the reply back and reduces the caller's balance by that amount. If not enough balance, then no reply is posted.

Later, the owner of the off-chain-worker can call a simple withdraw function to withdraw the used ether from the oracle contract.<strong> Note:</strong> The owner of the off-chain-worker and the oracle contract must be the same account.<br>

<strong>rechargeGas(address for)</strong>
```
params: (address for) => address of the caller for whom the ether gas balance is to be increased

info: increases the ether gas balance for a caller, to be used as gas later by the ocw while posting replies. The amount of ether must be sent with msg.value

access: public
```

<strong>withdrawGas(address to, uint val)</strong>
```
params: (to) => the account to which the ether is to be withdrawn, (val) => the amount of ether to withdraw

info: if after recharging his ether gas balance, a caller feels that he may not be using the ether, he may withdraw the ether using this function. the ether balance is deducted from the balance of msg.sender

access: public
```

<strong>balanceOf(address account)</strong>
```
params: (account) => the account for which to get the ether gas balance

info: gets the remaining unused ether gas balance of an account in the oracle contract

access: public
```

In the below functions, you may see a parameter named "gasPrice". Due to the volatile nature of ethereum's gas prices, it was difficult to agree on one gasPrice that will be used by the ocw to post back replies. Also, it would not be feasible to bring down the workers and change the gasPrice regularly. So a decision was made, that the gasPrice will be chosen by the caller. Whenever a caller posts a query to the oracle, he/she will also supply a gasPrice, and the ocw will use this same gasPrice while posting the reply for that caller.

<strong>getOracleValue(string pair1, string pair2, uint gasPrice)</strong>
```
info: this method is to be called by a caller to get the oracle value for a particular price pair like "btc/usd". Assigns an id to the request and returns the id. Also emits an event which will be picked up the ocw and processed to supply the oracle value.

example: getOracleValue("btc", "usd", "20000000000")

events: GetOracleValueEvent(callerAddress, id, pair1, pair2, gasPrice)

access: public
```

<strong>getDBValue(string uuid, string key, uint gasPrice)</strong>
```
info: this method is to be called by a caller to get the db value for a particular DB uuid & key. Assigns an id to the request and returns the id. Also emits an event which will be picked up the ocw and processed to supply the db value.

example: getDBValue('db001', 'name', '20000000000')

events: GetDBValueEvent(callerAddress, id, uuid, key, gasPrice)

access: public
```

<strong>withdraw(uint amount)</strong>
```
info:  withdraws ether from the contracts balance to the owner, to be used by the ocw as gas the owner will only be able to withdraw ether that has been used by the callers
this is so that, the caller may later withdraw the unused gas if he/she wants to.

params: (amount) => amount of ether to withdraw by owner

access: only owner
```

<strong>withdrawAll()</strong>
```
info: withdraws all the used ether from the contract to the owner

access: only owner
```

<strong>setOracleValue(uint latestPrice, address callerAddress, uint id)</strong>
```
info: sets the oracle value for a particular request id, and also calls the callback function of the caller address. To be called only by the ocw once the value is retrieved off chain

access: only owner
```

<strong>setDBValue(string value, address callerAddress, uint id)</strong>
```
info: sets the db value for a particular request id, and also calls the callback function of the caller address. To be called only by the ocw once the db value is retrieved off chain

access: only owner
```

## A Note on Fees
When the worker makes a request, it deducts the gas spent from the caller's balance. Now, this gas has to be calculated in advance, before making the request. For that we are using truffle's estimateGas function & sending that exact gas as the maximum gas to be used while making the request. Turns out, truffle overestimates the gas calculation a bit, and hence the worker is returned some gas, but the full estimated gas is deducted from the caller's balance. Hence, this returned gas is the fees earned by the worker. On average, this fees is around 0.00025 ether per request. 

## Setup & Installation
1. Install [truffle](https://www.trufflesuite.com/docs/truffle/getting-started/installation) & [ganache-cli](https://github.com/trufflesuite/ganache-cli), if you haven't already.

2. Rename the .env.example file to .env. Also replace the values with real values from your accounts.

3. Install the js dependencies
```
npm install
```

### For running tests
4. Open a new terminal and start up a local ganache server using below command
```
ganache-cli
```
5. Compile the contracts
```
truffle compile
```
6. Migrate the contracts
```
truffle migrate
```
<strong>Note:</strong> Since both the workers & the test files need to be using the same oracle contract address, the above function also saves the deployed address to a file named "ORACLEADDRESS" in the root directory. <br>

7. Open another terminal and run the Oracle Worker using below command from project root directory
```
truffle exec ocw/OracleWorker.js
```
8. Open another terminal and run the DB Worker, from project root
```
truffle exec ocw/DBWorker.js
```
9. Run the tests
```
truffle test
```
<img src="https://user-images.githubusercontent.com/47485188/128638120-05263733-43ed-4c6f-8cb2-c09e294c7ae7.png"></img>


## Ropsten Addresses
BluZelle Oracle: [0xf670AF0b1c8a6229C7C3c96Ba3993894436dF44F](https://ropsten.etherscan.io/address/0xf670AF0b1c8a6229C7C3c96Ba3993894436dF44F)<br>
CallerContract:  [0xcbeEb51524De23a62E1777B6506D07E3A7061CAb](https://ropsten.etherscan.io/address/0xcbeEb51524De23a62E1777B6506D07E3A7061CAb)