// scripts/generateMerkleTree.js
const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { ethers } = require('ethers');

async function fetchTransactions(blockNumber, network = 'sepolia') {
  const rpcUrl = network === 'sepolia' ? process.env.SEPOLIA_RPC_URL : process.env.ZKSYNC_RPC_URL;
  if (!rpcUrl) throw new Error(`RPC URL for ${network} not set.`);
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const block = await provider.getBlockWithTransactions(blockNumber);
  if (!block) throw new Error(`Block ${blockNumber} not found.`);
  return block.transactions.map(tx => tx.hash);
}

function generateMerkleTree(txHashes) {
  const leaves = txHashes.map(txHash => keccak256(txHash));
  return new MerkleTree(leaves, keccak256, { sortPairs: true });
}

function saveMerkleData(tree, txHashes, targetTxHash) {
  const root = tree.getHexRoot();
  const leaf = keccak256(targetTxHash);
  const proof = tree.getHexProof(leaf);
  const data = { merkleRoot: root, transaction: targetTxHash, proof: proof };
  fs.writeFileSync(path.join(__dirname, 'merkleData.json'), JSON.stringify(data, null, 2));
  console.log(`Merkle Root: ${root}`);
  console.log(`Transaction Hash: ${targetTxHash}`);
  console.log(`Merkle Proof: ${JSON.stringify(proof, null, 2)}`);
  console.log(`Data saved to merkleData.json`);
}

(async () => {
  const blockNumber = 1234567; // Replace with target block number
  const network = 'sepolia'; // or 'zksync'
  const txHashes = await fetchTransactions(blockNumber, network);
  if (txHashes.length === 0) { console.error('No transactions found.'); return; }
  const tree = generateMerkleTree(txHashes);
  const targetTxHash = txHashes[0]; // Select desired transaction
  saveMerkleData(tree, txHashes, targetTxHash);
})();
