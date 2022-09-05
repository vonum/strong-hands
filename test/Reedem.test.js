require("dotenv").config();
const chai = require("chai");
const { expect } = require("chai");
const { solidity } = require("ethereum-waffle");
const { resetFork } = require("./testUtils");

chai.use(solidity);

const WETH_GATEWAY_ADDRESS = process.env.WETH_GATEWAY_ADDRESS;
const AWETH_CONTRACT_ADDRESS = process.env.AWETH_CONTRACT_ADDRESS;
const LENDING_POOL_ADDRESS = process.env.LENDING_POOL_ADDRESS;

describe("StrongHands", () => {
  const interval = 100;
  let user, user1;

  beforeEach(async () => {
    await resetFork();
    const signers = await ethers.getSigners();
    user = signers[0];
    user1 = signers[1];

    this.StrongHandsFactory = await ethers.getContractFactory("StrongHands");
    this.contract = await this.StrongHandsFactory.deploy(
      interval,
      WETH_GATEWAY_ADDRESS,
      AWETH_CONTRACT_ADDRESS,
      LENDING_POOL_ADDRESS
    );

    this.aweth = await ethers.getContractAt("IAToken", AWETH_CONTRACT_ADDRESS);
  });

  it("Redeems reward aWETH tokens", async () => {
    await this.contract.deposit({value: 100});
    await this.contract.connect(user1).deposit({value: 200});

    const tx = this.contract.redeem();

    await expect(tx)
      .to.be.revertedWith("No reward tokens to redeem");
  });
});
