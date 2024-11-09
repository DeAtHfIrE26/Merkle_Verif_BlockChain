// scripts/fetchTransactions.js
require('dotenv').config();
const { ethers } = require('ethers');

async function fetchTransactions(blockNumber, network = 'sepolia') {
  const rpcUrl = network === 'sepolia' ? process.env.SEPOLIA_RPC_URL : process.env.ZKSYNC_RPC_URL;
  if (!rpcUrl) throw new Error(`RPC URL for ${network} not set.`);
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const block = await provider.getBlockWithTransactions(blockNumber);
  if (!block) throw new Error(`Block ${blockNumber} not found.`);
  const txHashes = block.transactions.map(tx => tx.hash);
  console.log(`Fetched ${txHashes.length} transactions from block ${blockNumber} on ${network}.`);
  console.log(txHashes);
  return txHashes;
}

// Execute the function
(async () => {
  const blockNumber = 1234567; // Replace with target block number
  await fetchTransactions(blockNumber, 'sepolia'); // or 'zksync'
})();
