const axios = require('axios');
const fs = require('fs');

const BLUZELLE_BASE_URL =
  'https://client.sentry.testnet.public.bluzelle.com:1317/aggregator/latestPair';
const SLEEP_INTERVAL = process.env.SLEEP_INTERVAL || 2000;
const CHUNK_SIZE = process.env.CHUNK_SIZE || 3;
const MAX_RETRIES = process.env.MAX_RETRIES || 3;
const multiplier = 8;

let pendingOracleRequests = [];

const Oracle = artifacts.require('BluzelleOracle');

const retrievePriceFromBluzelle = async (pair1, pair2) => {
  const resp = await axios({
    url: `${BLUZELLE_BASE_URL}/${pair1}/${pair2}`,
    method: 'get',
  });

  // if the result value is null throw an error
  try {
    return resp.data.result.Value;
  } catch (err) {
    throw "Error: Requested Pair doesn't Exist";
  }
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
  oracleContract.GetOracleValueEvent((err, event) => {
    if (err) {
      console.log(err);
      return;
    }
    addOracleRequestToQueue(event);
    console.log(pendingOracleRequests);
  });
};

const addOracleRequestToQueue = async (event) => {
  const { callerAddress, id, pair1, pair2 } = event.returnValues;
  pendingOracleRequests.push({ callerAddress, id, pair1, pair2 });
};

const processQueue = async (oracleContract, ownerAddress) => {
  let processedRequests = 0;
  while (pendingOracleRequests.length > 0 && processedRequests < CHUNK_SIZE) {
    const req = pendingOracleRequests.shift();
    await processRequest(oracleContract, ownerAddress, req);
    processedRequests++;
  }
};

const processRequest = async (oracleContract, ownerAddress, req) => {
  const { callerAddress, id, pair1, pair2 } = req;
  let retries = 0;
  while (retries < MAX_RETRIES) {
    try {
      const latestPrice = await retrievePriceFromBluzelle(pair1, pair2);
      await updateOracleContract(
        oracleContract,
        callerAddress,
        ownerAddress,
        latestPrice.toString(),
        id
      );
      return;
    } catch (err) {
      // if the price retrieval from Bluzelle API fails more than MAX_RETRIES times
      // then update the Oracle Contract with a price of zero
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

const cleanPrice = (price) => {
  price = parseFloat(price);
  price = parseInt(price * 10 ** multiplier);
  return price;
};

const updateOracleContract = async (
  oracleContract,
  callerAddress,
  ownerAddress,
  latestPrice,
  id
) => {
  latestPrice = cleanPrice(latestPrice);
  // get the gas balance of the caller
  const gasBalance = await oracleContract.balanceOf(callerAddress);

  try {
    // get the gas estimate for the setOracleValue call
    const gasEstimate = await oracleContract.setOracleValue.estimateGas(
      latestPrice,
      callerAddress,
      id,
      {
        from: ownerAddress,
      }
    );

    if (gasBalance >= gasEstimate) {
      try {
        console.log('Estimated Gas: ', gasEstimate);
        await oracleContract.setOracleValue(latestPrice, callerAddress, id, {
          from: ownerAddress,
          gas: gasEstimate,
        });
      } catch (err) {
        console.log(
          'From Worker: Error while calling setOracleValue',
          err.message
        );
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
    return;
  }
};

// save the address to use with the testing file
const saveAddress = (address) => {
  fs.writeFileSync('ORACLEADDRESS', address);
};

const init = async () => {
  const [ownerAddress] = await web3.eth.getAccounts();
  const oracleAddress = getAddress();
  const oracleContract = await getOracleContract(oracleAddress);
  saveAddress(oracleContract.address);
  filterEvents(oracleContract);
  return { oracleContract, ownerAddress };
};

module.exports = function (_) {
  (async () => {
    const { oracleContract, ownerAddress } = await init();
    process.on('SIGINT', () => {
      console.log('Calling client.disconnect()');
      process.exit();
    });
    setInterval(async () => {
      await processQueue(oracleContract, ownerAddress);
    }, SLEEP_INTERVAL);
  })();
};
