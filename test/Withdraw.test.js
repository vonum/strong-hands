require("dotenv").config();
const chai = require("chai");
const { expect } = require("chai");
const { solidity } = require("ethereum-waffle");
const { time } = require("@openzeppelin/test-helpers");
const { resetFork } = require("./testUtils");

chai.use(solidity);

const WETH_GATEWAY_ADDRESS = process.env.WETH_GATEWAY_ADDRESS;
const AWETH_CONTRACT_ADDRESS = process.env.AWETH_CONTRACT_ADDRESS;
const LENDING_POOL_ADDRESS = process.env.LENDING_POOL_ADDRESS;

const gasCostInWei = async (tx) => {
  const receipt = await tx.wait()
  return receipt.gasUsed.mul(receipt.effectiveGasPrice);
}

const balance = async (address) => await ethers.provider.getBalance(address);

describe("StrongHands", () => {
  const interval = 100;
  let user, user1, user2;

  beforeEach(async () => {
    await resetFork();
    const signers = await ethers.getSigners();
    user = signers[0];
    user1 = signers[1];
    user2 = signers[2];

    this.StrongHandsFactory = await ethers.getContractFactory("StrongHands");
    this.contract = await this.StrongHandsFactory.deploy(
      interval,
      WETH_GATEWAY_ADDRESS,
      AWETH_CONTRACT_ADDRESS,
      LENDING_POOL_ADDRESS
    );

    this.aweth = await ethers.getContractAt("IAToken", AWETH_CONTRACT_ADDRESS);
  });

  it("Returns user's coins without penalty", async () => {
    await this.contract.deposit({value: 100});
    time.increase(101);

    const initTotalDepositors = await this.contract.totalDepositors();
    const initTotalDeposit = await this.contract.totalDeposit();
    const initUserDeposit = await this.contract.deposits(user.address);
    const initUserBalance = await balance(user.address);

    const tx = await this.contract.withdraw();
    const gasCost = await gasCostInWei(tx);

    const lateTotalDepositors = await this.contract.totalDepositors();
    const lateTotalDeposit = await this.contract.totalDeposit();
    const lateUserDeposit = await this.contract.deposits(user.address);
    const lateUserBalance = await balance(user.address);

    const userBalance = initUserBalance.sub(gasCost).add(100);

    expect(initTotalDepositors).to.eq(1);
    expect(initTotalDeposit).to.eq(100);
    expect(initUserDeposit).to.eq(100);

    expect(lateTotalDepositors).to.eq(0);
    expect(lateTotalDeposit).to.eq(0);
    expect(lateUserDeposit).to.eq(0);

    expect(lateUserBalance).to.eq(userBalance);
  });

  it("Emits event when users withdraw", async () => {
    await this.contract.deposit({value: 100});
    time.increase(101);
    const tx = this.contract.withdraw();

    await expect(tx)
      .to.emit(this.contract, "Withdrew")
      .withArgs(user.address, 100, 0);
  });

  it("Reverts when user has no deposit", async () => {
    const tx = this.contract.withdraw();
    await expect(tx).to.be.revertedWith("No deposit");
  });

  it("Penalizes users when they deposit before the end of lock period", async () => {
    await this.contract.deposit({value: 100});

    const initUserBalance = await balance(user.address);

    const tx = await this.contract.withdraw();
    const gasCost = await gasCostInWei(tx);

    const lateUserBalance = await balance(user.address);
    const penalties = await this.contract.penalties();

    const userBalance = initUserBalance.sub(gasCost).add(100 - penalties);

    expect(lateUserBalance).to.eq(userBalance);
    // 50% penalty if withdrawn immediately
    expect(penalties.toNumber()).to.be.closeTo(50, 1);
  });

  it("Distributes penalties accross users as rewards", async () => {
    await this.contract.connect(user);
    await this.contract.deposit({value: 1000});

    await this.contract.connect(user1).deposit({value: 7500});
    await this.contract.connect(user2).deposit({value: 2500});

    await this.contract.withdraw();

    time.increase(101);

    const penalties = await this.contract.penalties();
    expect(penalties.toNumber()).to.be.closeTo(500, 30);

    const initUser1Balance = await balance(user1.address);
    const initUser2Balance = await balance(user2.address);

    const tx1 = await this.contract.connect(user1).withdraw();
    const gasCost1 = await gasCostInWei(tx1);

    const tx2 = await this.contract.connect(user2).withdraw();
    const gasCost2 = await gasCostInWei(tx2);

    const lateUser1Balance = await balance(user1.address);
    const lateUser2Balance = await balance(user2.address);

    const user1Reward = parseInt(penalties.toNumber() * 0.75);
    const user2Reward = parseInt(penalties.toNumber() * 0.25);
    const user1Balance = initUser1Balance.sub(gasCost1).add(7500 + user1Reward);
    const user2Balance = initUser2Balance.sub(gasCost2).add(2500 + user2Reward);

    expect(user1Balance.sub(lateUser1Balance).toNumber()).to.be.closeTo(0, 30);
    expect(user2Balance.sub(lateUser2Balance).toNumber()).to.be.closeTo(0, 30);
  });

  it("Calculates penalty based on time passed", async () => {
    await this.contract.deposit({value: 100});

    time.increase(50);

    const initUserBalance = await balance(user.address);

    const tx = await this.contract.withdraw();
    const gasCost = await gasCostInWei(tx);

    const lateUserBalance = await balance(user.address);
    const penalties = await this.contract.penalties();

    const userBalance = initUserBalance.sub(gasCost).add(100 - penalties);

    expect(lateUserBalance).to.eq(userBalance);
    // 25 penalty if withdrawn after 50% of the lock period has passed
    expect(penalties.toNumber()).to.be.closeTo(25, 1);
  });
});
