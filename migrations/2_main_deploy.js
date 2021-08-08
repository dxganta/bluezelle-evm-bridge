const fs = require('fs');

const BluzelleOracle = artifacts.require('BluzelleOracle');
const CallerContract = artifacts.require('CallerContract');

// save the address to use with the testing file
const saveAddress = (address) => {
  fs.writeFileSync('ORACLEADDRESS', address);
};

module.exports = async (deployer, network) => {
  if (network == 'development') {
    await deployer.deploy(BluzelleOracle, { overwrite: false });
    const blu = await BluzelleOracle.deployed();

    saveAddress(blu.address);
  } else {
    await deployer.deploy(BluzelleOracle);
    const blu = await BluzelleOracle.deployed();

    saveAddress(blu.address);

    // also deploy the demo caller contract
    // if you just want to deploy the oracle contract then comment the below lines
    await deployer.deploy(CallerContract);
    const caller = await CallerContract.deployed();

    caller.setOracleAddress(blu.address);
  }
};
