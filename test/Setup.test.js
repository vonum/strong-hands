require("dotenv").config();
const { expect } = require("chai");
const { resetFork } = require("./testUtils");

const WETH_GATEWAY_ADDRESS = process.env.WETH_GATEWAY_ADDRESS;
const AWETH_CONTRACT_ADDRESS = process.env.AWETH_CONTRACT_ADDRESS;
const LENDING_POOL_ADDRESS = process.env.LENDING_POOL_ADDRESS;

describe("StrongHands", () => {
  const interval = 100;
  let user;

  beforeEach(async () => {
    await resetFork();
    const signers = await ethers.getSigners();
    user = signers[0];

    this.StrongHandsFactory = await ethers.getContractFactory("StrongHands");
    this.contract = await this.StrongHandsFactory.deploy(
      interval,
      WETH_GATEWAY_ADDRESS,
      AWETH_CONTRACT_ADDRESS,
      LENDING_POOL_ADDRESS
    );
  });

  it("Sets contract params properly", async () => {
    const timeframe = await this.contract.timeframe();
    const basis_point = await this.contract.BASIS_POINT();
    const totalDeposit = await this.contract.totalDeposit();
    const penalties = await this.contract.penalties();
    const contractOwner = await this.contract.owner();
    const gatewayAddress = await this.contract.gateway();
    const aWETHAddress = await this.contract.aWETH();

    expect(timeframe.toNumber()).to.eq(100);
    expect(basis_point.toNumber()).to.eq(100);
    expect(totalDeposit.toNumber()).to.eq(0);
    expect(penalties.toNumber()).to.eq(0);
    expect(contractOwner).to.eq(user.address);
    expect(gatewayAddress).to.eq(WETH_GATEWAY_ADDRESS);
    expect(aWETHAddress).to.eq(AWETH_CONTRACT_ADDRESS);
  });
});
