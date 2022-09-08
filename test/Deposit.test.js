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

  it("Sets appropriate storage variables", async () => {
    await this.contract.deposit({value: 100});

    const totalDeposit = await this.contract.totalDeposit();
    const userDeposit = await this.contract.deposits(user.address);
    const totalDepositors = await this.contract.totalDepositors()

    expect(totalDeposit.toNumber()).to.eq(100);
    expect(userDeposit.toNumber()).to.eq(100);
    expect(totalDepositors.toNumber()).to.eq(1);
  });

  it("Doesn't increase number of depositors if user already deposited", async () => {
    await this.contract.deposit({value: 100});
    await this.contract.deposit({value: 100});

    const userDeposit = await this.contract.deposits(user.address);
    const totalDepositors = await this.contract.totalDepositors()

    expect(userDeposit.toNumber()).to.eq(200);
    expect(totalDepositors.toNumber()).to.eq(1);
  });

  it("Sets appropriate lock period", async () => {
    const tx = this.contract.deposit({value: 100});
    const block = await ethers.provider.getBlock(tx.blockNumber);
    const lockPeriod = await this.contract.lockPeriods(user.address);
    const startTimestamp = lockPeriod.toNumber();

    expect(startTimestamp).to.be.closeTo(block.timestamp, 1);
  });

  it("Emits event when users deposit", async () => {
    const tx = this.contract.deposit({value: 100});
    const block = await ethers.provider.getBlock(tx.blockNumber);

    await expect(tx)
      .to.emit(this.contract, "Deposited")
      .withArgs(user.address, 100, block.timestamp + interval + 1);
  });

  it("Reverts when users deposit 0 ethers", async () => {
    const tx = this.contract.deposit();

    await expect(tx)
      .to.be.revertedWith("Deposited 0 ethers");
  });

  it("Mints the same number of aWETH tokens", async () => {
    await this.contract.deposit({value: 100});
    await this.contract.connect(user1).deposit({value: 200});

    const b = await this.aweth.balanceOf(this.contract.address);

    expect(b.toNumber()).to.eq(300);
  });
});
