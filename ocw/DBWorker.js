const axios = require('axios');
const fs = require('fs');
const { bluzelle } = require('@bluzelle/sdk-js');
const dotenv = require('dotenv');
var util = require('util');
const config = require('../config');

const SLEEP_INTERVAL = process.env.SLEEP_INTERVAL || 2000;
const PRIVATE_KEY_FILE_NAME =
  process.env.PRIVATE_KEY_FILE || './oracle/oracle_private_key';
const CHUNK_SIZE = process.env.CHUNK_SIZE || 3;
const MAX_RETRIES = process.env.MAX_RETRIES || 5;

let pendingDBRequests = [];

const Oracle = artifacts.require('BluzelleOracle');

function Utf8ArrayToStr(array) {
  var out, i, len, c;
  var char2, char3;

  out = '';
  len = array.length;
  i = 0;
  while (i < len) {
    c = array[i++];
    switch (c >> 4) {
      case 0:
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
      case 6:
      case 7:
        // 0xxxxxxx
        out += String.fromCharCode(c);
        break;
      case 12:
      case 13:
        // 110x xxxx   10xx xxxx
        char2 = array[i++];
        out += String.fromCharCode(((c & 0x1f) << 6) | (char2 & 0x3f));
        break;
      case 14:
        // 1110 xxxx  10xx xxxx  10xx xxxx
        char2 = array[i++];
        char3 = array[i++];
        out += String.fromCharCode(
          ((c & 0x0f) << 12) | ((char2 & 0x3f) << 6) | ((char3 & 0x3f) << 0)
        );
        break;
    }
  }

  return out;
}

const retrieveDBValueFromBluzelle = async (sdk, uuid, key) => {
  const resp = await sdk.db.q.Read({
    uuid,
    key,
  });
  return Utf8ArrayToStr(resp.value);
};

const getOracleContract = async (oracleAddress) => {
  // oracle contract must be already deployed using "truffle migrate"
  let oracleContract = await Oracle.at(oracleAddress);
  return oracleContract;
};

const filterEvents = async (oracleContract) => {
  oracleContract.GetDBValueEvent((err, event) => {
    if (err) {
      console.log(err);
      return;
    }
    addDBRequestToQueue(event);
    console.log(pendingDBRequests);
  });
};

const addDBRequestToQueue = async (event) => {
  const { callerAddress, id, uuid, key, gasPrice } = event.returnValues;
  pendingDBRequests.push({ callerAddress, id, uuid, key, gasPrice });
};

const processQueue = async (sdk, oracleContract, ownerAddress) => {
  let processedRequests = 0;
  while (pendingDBRequests.length > 0 && processedRequests < CHUNK_SIZE) {
    const req = pendingDBRequests.shift();
    await processRequest(sdk, oracleContract, ownerAddress, req);
    processedRequests++;
  }
};

const processRequest = async (sdk, oracleContract, ownerAddress, req) => {
  const { callerAddress, id, uuid, key, gasPrice } = req;
  let retries = 0;
  while (retries < MAX_RETRIES) {
    try {
      const value = await retrieveDBValueFromBluzelle(sdk, uuid, key);
      await updateOracleContract(
        oracleContract,
        callerAddress,
        ownerAddress,
        value,
        id,
        gasPrice
      );
      return;
    } catch (err) {
      if (retries == MAX_RETRIES - 1) {
        await updateOracleContract(
          oracleContract,
          callerAddress,
          ownerAddress,
          'null',
          id,
          gasPrice
        );
        return;
      }
      retries++;
    }
  }
};

const updateOracleContract = async (
  oracleContract,
  callerAddress,
  ownerAddress,
  value,
  id,
  gasPrice
) => {
  // get the gas balance of the caller
  const gasBalance = await oracleContract.balanceOf(callerAddress);

  try {
    // get the gas estimate for the setDBValue call
    const gasEstimate = await oracleContract.setDBValue.estimateGas(
      value,
      callerAddress,
      id,
      {
        from: ownerAddress,
      }
    );
    if (gasBalance >= gasEstimate * gasPrice) {
      try {
        console.log('Estimated Gas: ', gasEstimate);
        await oracleContract.setDBValue(value, callerAddress, id, {
          from: ownerAddress,
          gas: gasEstimate,
          gasPrice: gasPrice,
        });
      } catch (err) {
        console.log('Error while calling setDBValue', err.message);
      }
    } else {
      console.log('Error: Not enough gas balance for ', callerAddress);
    }
  } catch (err) {
    console.log('Cannot estimate gas for caller ', callerAddress);
  }
};

// get the address if contract already deployed
const getAddress = () => {
  try {
    return fs.readFileSync('ORACLEADDRESS', (encoding = 'utf8'));
  } catch (err) {
    console.log('Cannot get address');
    return;
  }
};

const init = async () => {
  dotenv.config();
  const [ownerAddress] = await web3.eth.getAccounts();
  const oracleAddress = getAddress();

  const sdk = await bluzelle({
    mnemonic: process.env.BLUZELLE_MNEMONIC,
    url: 'wss://client.sentry.testnet.private.bluzelle.com:26657',
    maxGas: 100000000,
    gasPrice: 0.002,
  });

  const oracleContract = await getOracleContract(oracleAddress);
  filterEvents(oracleContract);
  return { sdk, oracleContract, ownerAddress };
};

module.exports = function (_) {
  (async () => {
    const { sdk, oracleContract, ownerAddress } = await init();
    process.on('SIGINT', () => {
      console.log('Calling client.disconnect()');
      process.exit();
    });
    setInterval(async () => {
      await processQueue(sdk, oracleContract, ownerAddress);
    }, SLEEP_INTERVAL);
  })();
};
