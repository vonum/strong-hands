require("dotenv").config();

const WETH_GATEWAY_ADDRESS = process.env.WETH_GATEWAY_ADDRESS;
const AWETH_CONTRACT_ADDRESS = process.env.AWETH_CONTRACT_ADDRESS;
const LENDING_POOL_ADDRESS = process.env.LENDING_POOL_ADDRESS;
const INTERVAL = 100;

async function main() {
  const [deployer] = await ethers.getSigners();

  const strongHandsFactory = await ethers.getContractFactory("StrongHands");
  const strongHands = await strongHandsFactory.deploy(
    INTERVAL,
    WETH_GATEWAY_ADDRESS,
    AWETH_CONTRACT_ADDRESS,
    LENDING_POOL_ADDRESS
  )
  await strongHands.deployed();
  console.log("Strong Hands contract deployed to address:", strongHands.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
