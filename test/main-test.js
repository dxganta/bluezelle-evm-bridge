const { assert } = require('console');
const fs = require('fs');
const Oracle = artifacts.require('BluzelleOracle');

let oracleAddress = '';

fs.readFile('ORACLEADDRESS', (encoding = 'utf-8'), (err, data) => {
  if (err) throw err;
  oracleAddress = data;
});

contract('Console tests', async () => {
  // beforeEach(async () => {
  //   oracleContract = await Oracle.at(oracleAddress);
  // });

  // it('should fire GetOracleValueEvent', async () => {
  //   const tx = await oracleContract.getOracleValue('btc', 'usd');

  //   assert(tx.logs[0].event == 'GetOracleValueEvent');
  // });

  // it('should fire GetDBValueEvent', async () => {
  //   const tx = await oracleContract.getDBValue('1101', 'name');

  //   assert(tx.logs[0].event == 'GetDBValueEvent');
  // });

  const cleanPrice = (price) => {
    const multiplier = 8;
    price = parseFloat(price);
    price = parseInt(price * 10 ** multiplier);
    return price;
  };

  it('test', async () => {
    let price = '21127.74562777363';

    price = cleanPrice(price);

    const oracleContract = await Oracle.new();

    console.log(price.toString());
    const tx = await oracleContract.testPrice(price.toString());
  });
});
