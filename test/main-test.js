const Oracle = artifacts.require('BluezelleOracle');

const oracleAddress = '0x7f9b239859aBeBd7035c5C400037a46EEFD44785';

contract('Console tests', async () => {
  it('should fire event', async () => {
    oracleContract = await Oracle.at(oracleAddress);

    console.log(oracleContract.address);

    await oracleContract.getOracleValue('btc', 'sex');
  });
});
