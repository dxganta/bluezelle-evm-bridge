// const axios = require('axios');
// const BN = require('bn.js');

// const artifacts = require('truffle');

const SLEEP_INTERVAL = process.env.SLEEP_INTERVAL || 2000;
const PRIVATE_KEY_FILE_NAME =
  process.env.PRIVATE_KEY_FILE || './oracle/oracle_private_key';
const CHUNK_SIZE = process.env.CHUNK_SIZE || 3;
const MAX_RETRIES = process.env.MAX_RETRIES || 5;
var pendingRequests = [];

const Oracle = artifacts.require('BluezelleOracle');

async function getOracleContract(oracleAddress) {
  let oracleContract;

  if (oracleAddress) {
    oracleContract = await Oracle.at(oracleAddress);
  } else {
    oracleContract = await Oracle.new();
  }
  return oracleContract;
}

async function filterEvents(oracleContract) {
  oracleContract.GetOracleValueEvent((err, event) => {
    if (err) {
      console.log(err);
      return;
    }
    console.log(event);
  });
}

async function main() {
  const contract = await getOracleContract();
  console.log(contract.address);
  filterEvents(contract);
}

module.exports = function (callback) {
  (async () => {
    main();
    process.on('SIGINT', () => {
      console.log('Calling client.disconnect()');
      process.exit();
    });
  })();
};
