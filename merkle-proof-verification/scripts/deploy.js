// scripts/deploy.js
const hre = require("hardhat");
require('dotenv').config();

async function main() {
  const MerkleVerifier = await hre.ethers.getContractFactory("MerkleVerifier");
  const merkleVerifier = await MerkleVerifier.deploy();
  await merkleVerifier.deployed();
  console.log("MerkleVerifier deployed to:", merkleVerifier.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
