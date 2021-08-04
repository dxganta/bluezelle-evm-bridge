## Notes
1. Make sure to delete the ORACLEADDRESS file, everytime you compile 
2. Talk about the gas price in the video. How difficult it is to set a gas price for the transaction. Maybe check the new ethereum london upgradge gas price selector.
3. So you will need another thing. To change the gas price, the owner has to stop the worker, change the price & redeploy the worker. Now, we don't want to release the pending requests while the worker is stopped right. So integrate that block thing that the crypto zombie guys said, to keep track of the last block of the pending requests or something. I don't know. Check it.

4. It is very tricky to decide how much gas the oracleContract will use while updating the values, so a decision was taken to have that gasPrice value passed by the caller itself.

2. Caller Contract Flow
  1. deploys contract
  2. sets the oracle Address
  3. recharges gas 
  4. calls the getOracleValue or getDbValue