const IntroMoney = artifacts.require("IntroMoney");
require("dotenv").config({ path: "../.env" });

module.exports = async function (deployer, network, accounts) {
  await deployer.deploy(
    IntroMoney,
    1,
    1,
    process.env.CONTRACT_OWNER_ADDRESS_FANTOM,
    5,
    "10000000000000000",
    2
  );
  const introMoney = await IntroMoney.deployed();
};
