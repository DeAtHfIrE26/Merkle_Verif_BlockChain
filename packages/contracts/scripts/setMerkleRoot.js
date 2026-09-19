/**
 * Publish a Merkle root to an already-deployed MerkleVerifier.
 *
 * Requires CONTRACT_ADDRESS alongside the network credentials. The root is
 * built from the values passed after `--`, or from the bundled sample set:
 *
 *   npm run set-root --workspace=packages/contracts -- 0xaaa... 0xbbb...
 */
const hre = require('hardhat');
const { buildMerkleTree, hashLeaf, SAMPLE_TX_HASHES } = require('@merkle-verify/core');

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error('CONTRACT_ADDRESS is not set. See .env.example.');
  }

  const args = process.argv.slice(2).filter((a) => a.startsWith('0x') || !a.startsWith('-'));
  const values = args.length > 0 ? args : [...SAMPLE_TX_HASHES];
  if (args.length === 0) {
    console.log('No values given; using the bundled sample transaction hashes.');
  }

  const tree = buildMerkleTree(values.map(hashLeaf));
  console.log(`Leaves: ${values.length}`);
  console.log(`Root:   ${tree.root}`);

  const verifier = await hre.ethers.getContractAt('MerkleVerifier', contractAddress);
  const tx = await verifier.setMerkleRoot(tree.root);
  console.log(`Submitted ${tx.hash}, waiting for confirmation…`);
  await tx.wait();

  console.log(`Merkle root set to ${await verifier.merkleRoot()}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
