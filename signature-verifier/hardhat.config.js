// hardhat.config.js
require("@nomiclabs/hardhat-waffle");

module.exports = {
  solidity: "0.8.0",
  networks: {
    sepolia: {
      url: "https://sepolia.infura.io/v3/21155fa07fa947d09b9cf7c600fd1f67", // Replace with your Infura project ID
      accounts: ["0x1234567890abcdef1234567890abcdef12345678"] // Replace with your private key (without 0x)
    }
  }
};
