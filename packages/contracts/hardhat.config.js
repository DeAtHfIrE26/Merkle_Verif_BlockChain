require('@nomicfoundation/hardhat-ethers');
require('@nomicfoundation/hardhat-chai-matchers');
require('dotenv').config();

const { subtask } = require('hardhat/config');
const { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } = require('hardhat/builtin-tasks/task-names');

const SOLC_VERSION = '0.8.18';

/**
 * Compile with the solc build published to npm instead of downloading it from
 * binaries.soliditylang.org.
 *
 * It is the same compiler, it makes builds reproducible from the lockfile, and
 * it means `npm test` works in sandboxed or offline CI where that host is not
 * reachable. Remove this subtask if you would rather Hardhat manage the
 * download itself.
 */
subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD, async (args, _hre, runSuper) => {
  if (args.solcVersion === SOLC_VERSION) {
    return {
      compilerPath: require.resolve('solc/soljson.js'),
      isSolcJs: true,
      version: args.solcVersion,
      longVersion: `${SOLC_VERSION}-npm`,
    };
  }
  return runSuper();
});

/**
 * Networks are only declared when the matching env vars are present.
 *
 * The previous config referenced process.env unconditionally, so `compile` and
 * `test` failed with HH8 unless you had a .env holding a real private key.
 * Local development needs no credentials.
 */
const networks = { hardhat: { chainId: 31337 } };

if (process.env.SEPOLIA_RPC_URL && process.env.PRIVATE_KEY) {
  networks.sepolia = {
    url: process.env.SEPOLIA_RPC_URL,
    accounts: [process.env.PRIVATE_KEY],
    chainId: 11155111,
  };
}

module.exports = {
  solidity: {
    version: SOLC_VERSION,
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks,
  paths: { sources: './contracts', tests: './test', cache: './cache', artifacts: './artifacts' },
  mocha: { timeout: 120000 },
};
