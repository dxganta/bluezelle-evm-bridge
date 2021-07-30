const axios = require('axios');
const fs = require('fs');
const { bluzelle } = require('@bluzelle/sdk-js');
const dotenv = require('dotenv');

const SLEEP_INTERVAL = process.env.SLEEP_INTERVAL || 2000;
const PRIVATE_KEY_FILE_NAME =
  process.env.PRIVATE_KEY_FILE || './oracle/oracle_private_key';
const CHUNK_SIZE = process.env.CHUNK_SIZE || 3;
const MAX_RETRIES = process.env.MAX_RETRIES || 5;

let pendingDBRequests = [];

const Oracle = artifacts.require('BluzelleOracle');

const retrieveDBValueFromBluzelle = async (sdk, uuid, key) => {
  const resp = await sdk.db.q.Read({
    uuid,
    key,
  });
  return resp;
};

const getOracleContract = async (oracleAddress) => {
  let oracleContract;
  // if oracle contract is already deployed then use the deployed address
  if (oracleAddress) {
    oracleContract = await Oracle.at(oracleAddress);
  } else {
    // else deploy the contract
    oracleContract = await Oracle.new();
  }
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
  const { callerAddress, id, uuid, key } = event.returnValues;
  pendingDBRequests.push({ callerAddress, id, uuid, key });
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
  const { callerAddress, id, uuid, key } = req;
  let retries = 0;
  while (retries < MAX_RETRIES) {
    try {
      const value = await retrieveDBValueFromBluzelle(sdk, uuid, key);
      await updateOracleContract(
        oracleContract,
        callerAddress,
        ownerAddress,
        value,
        id
      );
      return;
    } catch (err) {
      if (retries == MAX_RETRIES - 1) {
        await updateOracleContract(
          oracleContract,
          callerAddress,
          ownerAddress,
          '0',
          id
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
  id
) => {
  try {
    await oracleContract.methods
      .setDBValue(value.toString(), callerAddress, id)
      .send({ from: ownerAddress });
  } catch (err) {
    console.log('Error while calling setDBValue', err.message);
  }
};

// get the address if contract already deployed
const getAddress = () => {
  try {
    return fs.readFileSync('ORACLEADDRESS', (encoding = 'utf8'));
  } catch (err) {
    return;
  }
};

// save the address to use with the testing file
const saveAddress = (address) => {
  fs.writeFileSync('ORACLEADDRESS', address);
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
  saveAddress(oracleContract.address);
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
      console.log('PROCESSING');
      await processQueue(sdk, oracleContract, ownerAddress);
    }, SLEEP_INTERVAL);
  })();
};
