// scripts/setMerkleRoot.js
const hre = require("hardhat");
require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) throw new Error("CONTRACT_ADDRESS not set in .env");
  
  const merkleDataPath = path.join(__dirname, 'merkleData.json');
  if (!fs.existsSync(merkleDataPath)) throw new Error("merkleData.json not found");
  
  const merkleData = JSON.parse(fs.readFileSync(merkleDataPath, 'utf-8'));
  const merkleRoot = merkleData.merkleRoot;

  const MerkleVerifier = await hre.ethers.getContractFactory("MerkleVerifier");
  const merkleVerifier = await MerkleVerifier.attach(contractAddress);
  
  const tx = await merkleVerifier.setMerkleRoot(merkleRoot);
  await tx.wait();
  
  console.log("Merkle Root set to:", merkleRoot);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
