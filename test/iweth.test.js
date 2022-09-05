require("dotenv").config();
const { expect } = require("chai");
const { resetFork } = require("./testUtils");

const WETH_GATEWAY_ADDRESS = process.env.WETH_GATEWAY_ADDRESS;
const LENDING_POOL_ADDRESS = process.env.LENDING_POOL_ADDRESS;
const AWETH_CONTRACT_ADDRESS = process.env.AWETH_CONTRACT_ADDRESS;

describe("StrongHands", () => {
  beforeEach(async () => {
    await resetFork();
    const signers = await ethers.getSigners();
    user = signers[0];

    // this.WETHGatewayFactory = await ethers.getContractFactory("interfaces/IWETHGateway.sol");
    // this.iwethGateway = this.WETHGatewayFactory.attach(WETH_GATEWAY_ADDRESS);

    this.aweth = await ethers.getContractAt("IAToken", AWETH_CONTRACT_ADDRESS);
    this.iwethGateway = await ethers.getContractAt("IWETHGateway", WETH_GATEWAY_ADDRESS);
  });

  it("keks", async () => {
    const tx = await this.iwethGateway.connect(user)
      .depositETH(LENDING_POOL_ADDRESS, user.address, 0, {value: 1000})

    // need to approve gateway to burn wrapped ether and release your ether
    await this.aweth.connect(user).approve(WETH_GATEWAY_ADDRESS, 1000);

    await this.iwethGateway.connect(user)
      .withdrawETH(LENDING_POOL_ADDRESS, 1000, user.address)

    console.log("PLS");
  });
});
