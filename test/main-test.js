const fs = require('fs');
const { catchRevert } = require('../exceptions.js');
const config = require('../config.js');
const Oracle = artifacts.require('BluzelleOracle');
const CallerContract = artifacts.require('CallerContract');
const gasP = config.gasPrice;

const dbUUid = 'db69';

const dbMap = new Map([
  ['luffy', 'captain'],
  ['zoro', 'swordsman'],
  ['sanji', 'cook'],
  ['franky', 'shipwright'],
  ['chopper', 'doctor'],
]);

// Notes
// To run the test, make sure the network is set to development, i.e your local ganache client

let oracleAddress = '';

fs.readFile('ORACLEADDRESS', (encoding = 'utf8'), (err, data) => {
  if (err) throw err;
  oracleAddress = data;
});

contract('Worker tests', async (accounts) => {
  before(async () => {
    // deploy the oracle contract
    oracleContract = await Oracle.at(oracleAddress);
  });

  it('Get Oracle Value Flow Single CallerContract', async () => {
    callerContract = await initCallerContract();
    const prevBtc = await callerContract.btcValue();
    // console.log('Previous Contract Value', prevBtc.toString());

    await callerContract.updateBtcValue(gasP);

    // wait for 5 seconds
    await sleep(5000);

    const newBtc = await callerContract.btcValue();
    // console.log('New Contract Value', newBtc.toString());

    assert.notEqual(prevBtc.toString(), newBtc.toString());
  });

  it('Get Oracle Value Flow Multiple CallerContracts', async () => {
    n = 6;
    callerContracts = [];
    prevBtcValues = [];
    newBtcValues = [];

    for (i = 0; i < n; i++) {
      callerContracts[i] = await initCallerContract();
      prevBtcValues[i] = await callerContracts[i].btcValue();
    }

    for (i = 0; i < callerContracts.length; i++) {
      callerContracts[i].updateBtcValue(gasP);
    }

    // wait for 20 seconds
    await sleep(20000);

    for (i = 0; i < callerContracts.length; i++) {
      newBtcValues[i] = await callerContracts[i].btcValue();
      // console.log(prevBtcValues[i].toString(), newBtcValues[i].toString());
      assert.notEqual(prevBtcValues[i].toString(), newBtcValues[i].toString());
    }
  });

  it('Get DB Value Flow Single CallerContract', async () => {
    const key = Array.from(dbMap.keys())[0];

    let c = await initCallerContract();

    await c.updateDBValue(dbUUid, key, gasP);

    // wait for 5 seconds
    await sleep(5000);

    const contractValue = await c.dbValue();

    assert.strictEqual(contractValue, dbMap.get(key));
  });

  it('Get DB Value Flow Multiple CallerContracts', async () => {
    keys = Array.from(dbMap.keys());
    n = 5;
    callerContracts = [];
    newDBValues = [];

    for (i = 0; i < n; i++) {
      callerContracts[i] = await initCallerContract();
    }

    for (i = 0; i < n; i++) {
      callerContracts[i].updateDBValue(dbUUid, keys[i], gasP);
    }

    await sleep(20000);

    for (i = 0; i < n; i++) {
      newVal = await callerContracts[i].dbValue();
      assert.strictEqual(newVal, dbMap.get(keys[i]));
    }
  });

  const initCallerContract = async () => {
    const callerContract = await CallerContract.new();
    await callerContract.setOracleAddress(oracleAddress);
    // recharge the caller contract with gas balance
    await callerContract.rechargeOracle({
      from: accounts[1],
      value: web3.utils.toWei('1', 'ether'),
    });

    return callerContract;
  };
});

contract('Gas Tests', async (accounts) => {
  before(async () => {
    // deploy the oracle contract
    oracleContract = await Oracle.at(oracleAddress);
    owner = accounts[0];
    user = accounts[2];
  });

  const initCallerContract = async () => {
    const c = await CallerContract.new();
    await c.setOracleAddress(oracleAddress);
    return c;
  };

  it('OracleContract Owner is only able to withdraw the Used Gas', async () => {
    let cContract = await initCallerContract();

    await cContract.rechargeOracle({
      from: accounts[1],
      value: web3.utils.toWei('1', 'ether'),
    });

    let usedBalance = await oracleContract.usedBalance();

    // should throw error
    await catchRevert(
      oracleContract.withdrawGas(accounts[2], toWei(1), {
        from: owner,
      })
    );

    // use some gas
    await cContract.updateBtcValue(gasP);

    // wait 5 seconds
    await sleep(5000);

    // make sure used balance is updated
    let newUsedBalance = await oracleContract.usedBalance();
    assert.isAbove(bnToInt(newUsedBalance), bnToInt(usedBalance));

    let oldBalance = await balance(owner);
    // without error
    await oracleContract.withdrawAll({
      from: owner,
    });

    let newBalance = await balance(owner);

    assert.isAbove(newBalance, oldBalance);

    const usedB = bnToInt(await oracleContract.usedBalance());

    // used balance must be zero after calling withdrawAll
    assert.strictEqual(usedB, 0);
  });

  it('The Oracle & DB Value must only get updated when the caller has enough gas balance', async () => {
    let callerContract = await initCallerContract();
    let key = 'luffy';

    const prevDBValue = await callerContract.dbValue();
    const prevOracleValue = await callerContract.btcValue();

    await callerContract.updateBtcValue(gasP);
    await callerContract.updateDBValue(dbUUid, key, gasP);

    // wait 5 seconds
    await sleep(5000);

    // The values must stay same and not get updated
    assert.strictEqual(
      prevDBValue.toString(),
      (await callerContract.dbValue()).toString()
    );
    assert.strictEqual(
      prevOracleValue.toString(),
      (await callerContract.btcValue()).toString()
    );

    await callerContract.rechargeOracle({
      from: accounts[1],
      value: web3.utils.toWei('1', 'ether'),
    });

    await callerContract.updateBtcValue(gasP);
    await callerContract.updateDBValue(dbUUid, key, gasP);

    // wait 5 seconds
    await sleep(5000);

    // This time the values must get updated
    console.log('DB VAlue', (await callerContract.dbValue()).toString());
    assert.strictEqual(
      dbMap.get(key),
      (await callerContract.dbValue()).toString()
    );
    assert.notEqual(
      prevOracleValue.toString(),
      (await callerContract.btcValue()).toString()
    );
  });

  it('Caller is able to withdraw un-used gas & not anymore', async () => {
    callerContract = await initCallerContract();
    c = callerContract.address;

    let gas = toWei(1);

    await callerContract.rechargeOracle({
      from: accounts[1],
      value: gas,
    });

    assert.strictEqual((await oracleContract.balanceOf(c)).toString(), gas);

    let prevBalance = await balance(accounts[2]);

    // should throw error if caller tries to withdraw more than gas balance
    await catchRevert(
      callerContract.withdrawGas(accounts[2], '1000000000000000001', {
        from: owner,
      }),
      'Not enough balance.'
    );

    await callerContract.withdrawGas(accounts[2], gas, { from: owner });

    let newBalance = await balance(accounts[2]);

    assert.strictEqual((newBalance - prevBalance).toString(), gas);
  });

  it('Gas Balance reduced for caller must be greater than or equal to the gas spent by the OracleWorker owner', async () => {
    // The actual gas will be paid by the OracleWorker owner
    // So make sure, the amount deducted from the caller's account must be greater or equal
    // to the amount deducted from the owner's account

    let c = await initCallerContract();

    await c.rechargeOracle({ from: accounts[1], value: toWei(1) });

    let initialCallerBalance = bnToInt(
      await oracleContract.balanceOf(c.address)
    );

    let initialOwnerBalance = await balance(owner);

    console.log('Previous Oracle value', bnToInt(await c.btcValue()));

    // use some gas
    await c.updateBtcValue(gasP, { from: user });

    // wait 5 seconds
    await sleep(5000);

    // check if oracle value is set
    console.log('New Oracle value', bnToInt(await c.btcValue()));

    let newOwnerBalance = await balance(owner);
    let newCallerBalance = bnToInt(await oracleContract.balanceOf(c.address));

    const ownerBalDiff = initialOwnerBalance - newOwnerBalance;
    const callerBalDiff = initialCallerBalance - newCallerBalance;

    assert.isAtMost(ownerBalDiff, callerBalDiff);

    console.log(
      'Fees earned by owner: ',
      (callerBalDiff - ownerBalDiff) / 10 ** 18,
      'Ether'
    );
  });
});

function bnToInt(bn) {
  return parseInt(bn.toString());
}

function toWei(amount) {
  return web3.utils.toWei(amount.toString(), 'ether');
}

async function balance(account) {
  return parseInt(await web3.eth.getBalance(account));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// TODO:

// Deploy the contracts to Ropsten
// Upload the workers to IPFS and keep em running
// update the tests based on the changes (unusedBalance => usedBalance, sending of gasPrice with caller requests)
// write the documentation & record demo video
