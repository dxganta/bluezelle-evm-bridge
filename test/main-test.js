const fs = require('fs');
const Oracle = artifacts.require('BluezelleOracle');

let oracleAddress = '';

fs.readFile('ORACLEADDRESS', (encoding = 'utf-8'), (err, data) => {
  if (err) throw err;
  oracleAddress = data;
});

contract('Console tests', async () => {
  it('should fire GetOracleValueEvent', async () => {
    oracleContract = await Oracle.at(oracleAddress);
    const tx = await oracleContract.getOracleValue('btc', 'usd');

    assert(tx.logs[0].event == 'GetOracleValueEvent');
  });
});
