const createTx = (from, to, value) => {return {from, to, value}};

const balance = async (address) => await web3.eth.getBalance(address);

const resetFork = async () => {
  await hre.network.provider.request({
    method: "hardhat_reset",
    params: [
      {
        forking: {
          jsonRpcUrl: process.env.FORK_URL,
          blockNumber: parseInt(process.env.FORK_BLOCK)
        },
      },
    ],
  });
}

module.exports = { createTx, balance, resetFork };
