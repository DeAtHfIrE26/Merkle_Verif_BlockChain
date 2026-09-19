/**
 * Deploy both verifiers to the configured network.
 *
 * Requires SEPOLIA_RPC_URL and PRIVATE_KEY in the environment; see
 * .env.example at the repository root. Never needed for local testing.
 *
 *   npm run deploy:sepolia --workspace=packages/contracts
 */
const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);

  console.log(`Network:  ${hre.network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance:  ${hre.ethers.formatEther(balance)} ETH`);

  if (balance === 0n) {
    throw new Error('Deployer has no balance. Fund it from a testnet faucet first.');
  }

  const merkleFactory = await hre.ethers.getContractFactory('MerkleVerifier');
  const merkleVerifier = await merkleFactory.deploy();
  await merkleVerifier.waitForDeployment();
  const merkleAddress = await merkleVerifier.getAddress();
  console.log(`MerkleVerifier    -> ${merkleAddress}`);

  const sigFactory = await hre.ethers.getContractFactory('SignatureVerifier');
  const signatureVerifier = await sigFactory.deploy();
  await signatureVerifier.waitForDeployment();
  const sigAddress = await signatureVerifier.getAddress();
  console.log(`SignatureVerifier -> ${sigAddress}`);

  console.log('\nTo enable on-chain verification in the web app, set:');
  console.log(`  NEXT_PUBLIC_MERKLE_VERIFIER_ADDRESS=${merkleAddress}`);
  console.log(`  NEXT_PUBLIC_CHAIN_ID=${(await hre.ethers.provider.getNetwork()).chainId}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
