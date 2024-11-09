// scripts/deploy.js
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const SignatureVerifier = await hre.ethers.getContractFactory("SignatureVerifier");
  const signatureVerifier = await SignatureVerifier.deploy();

  await signatureVerifier.deployed();

  console.log("SignatureVerifier deployed to:", signatureVerifier.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
