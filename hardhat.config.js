/** @type import('hardhat/config').HardhatUserConfig */
require("dotenv").config();
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-web3");
require("hardhat-docgen");

const {
  RINKEBY_API_URL,
  GOERLI_API_URL,
  FORK_URL,
  FORK_BLOCK,
  PRIVATE_KEY
} = process.env;

module.exports = {
   solidity: "0.8.15",
   defaultNetwork: "rinkeby",
   networks: {
     hardhat: {
       forking: {
         url: FORK_URL,
         blockNumber: parseInt(FORK_BLOCK)
       }
     },
     rinkeby: {
        url: RINKEBY_API_URL,
        accounts: [`0x${PRIVATE_KEY}`]
     },
     goerli: {
        url: GOERLI_API_URL,
        accounts: [`0x${PRIVATE_KEY}`]
     }
   },
  docgen: {
    path: "./docs",
    clear: true,
    runOnCompile: true,
  }
}
