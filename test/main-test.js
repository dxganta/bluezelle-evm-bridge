const fs = require('fs');
const Oracle = artifacts.require('BluzelleOracle');
const CallerContract = artifacts.require('CallerContract');

const dbUUid = 'db69';

const DBMap = {
  luffy: 'captain',
  zoro: 'swordsman',
  sanji: 'cook',
  franky: 'shipwright',
  chopper: 'doctor',
};

// Notes
// To run the test, make sure the network is set to development, i.e your local ganache client

let oracleAddress = '';

fs.readFile('ORACLEADDRESS', (encoding = 'utf8'), (err, data) => {
  if (err) throw err;
  oracleAddress = data;
});

contract('Worker tests', async () => {
  before(async () => {
    // deploy the oracle contract
    oracleContract = await Oracle.at(oracleAddress);
  });

  // it('Get Oracle Value Flow Single CallerContract', async () => {
  //   callerContract = await initCallerContract();
  //   const prevBtc = await callerContract.btcValue();
  //   console.log('Previous Contract Value', prevBtc.toString());

  //   await callerContract.updateBtcValue();

  //   // wait for 5 seconds
  //   await sleep(5000);

  //   const newBtc = await callerContract.btcValue();
  //   console.log('New Contract Value', newBtc.toString());

  //   assert.notEqual(prevBtc.toString(), newBtc.toString());
  // });

  // it('Get Oracle Value Flow Multiple CallerContracts', async () => {
  //   n = 6;
  //   callerContracts = [];
  //   prevBtcValues = [];
  //   newBtcValues = [];

  //   for (i = 0; i < n; i++) {
  //     callerContracts[i] = await initCallerContract();
  //     prevBtcValues[i] = await callerContracts[i].btcValue();
  //   }

  //   for (i = 0; i < callerContracts.length; i++) {
  //     callerContracts[i].updateBtcValue();
  //   }

  //   // wait for 30 seconds
  //   await sleep(30000);

  //   for (i = 0; i < callerContracts.length; i++) {
  //     newBtcValues[i] = await callerContracts[i].btcValue();
  //     console.log(prevBtcValues[i].toString(), newBtcValues[i].toString());
  //     assert.notEqual(prevBtcValues[i].toString(), newBtcValues[i].toString());
  //   }
  // });

  it('Get DB Value Flow Single CallerContract', async () => {
    const key = 'luffy';

    callerContract = await initCallerContract();

    await callerContract.updateDBValue(dbUUid, key);

    // wait for 5 seconds
    await sleep(5000);

    const contractValue = await callerContract.dbValue();

    assert.strictEqual(contractValue, DBMap[key]);
  });
});

const initCallerContract = async () => {
  const callerContract = await CallerContract.new();
  await callerContract.setOracleAddress(oracleAddress);

  return callerContract;
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
