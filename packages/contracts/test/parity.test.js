/**
 * Differential tests: the TypeScript implementation in packages/core and the
 * Solidity implementation in MerkleVerifier.sol must agree.
 *
 * The web app computes proofs in the browser with the TypeScript code; the
 * contract is what would accept or reject them on-chain. If the two ever
 * disagree, the app would show a proof as valid that the chain rejects — so
 * this suite pins them together over randomised input rather than over a
 * handful of hand-written vectors.
 */

const { expect } = require('chai');
const { ethers } = require('hardhat');
const {
  buildMerkleTree,
  getProof,
  hashLeaf,
  hashPair,
  processProof,
  verifyProof,
} = require('@merkle-verify/core');

/** Deterministic PRNG so a failure is reproducible from the seed alone. */
function createRng(seed) {
  let state = seed >>> 0 || 0x9e3779b9;
  return () => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0x100000000;
  };
}

describe('TypeScript ↔ Solidity parity', function () {
  let verifier;

  before(async function () {
    const factory = await ethers.getContractFactory('MerkleVerifier');
    verifier = await factory.deploy();
    await verifier.waitForDeployment();
  });

  describe('hashPair', function () {
    it('agrees on pair hashing regardless of argument order', async function () {
      const rng = createRng(0xc0ffee);
      for (let i = 0; i < 40; i += 1) {
        const a = hashLeaf(`pair-a-${Math.floor(rng() * 1e9)}`);
        const b = hashLeaf(`pair-b-${Math.floor(rng() * 1e9)}`);
        // A two-leaf tree's root is exactly the pair hash.
        const onChain = await verifier.processProof(a, [b]);
        expect(onChain).to.equal(hashPair(a, b));
        expect(await verifier.processProof(b, [a])).to.equal(hashPair(a, b));
      }
    });
  });

  describe('randomised trees', function () {
    // Sizes chosen to cover powers of two, odd counts that force node
    // promotion, and a prime.
    const SIZES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 13, 16, 17, 23, 32, 33, 64];

    it(`agrees on every leaf across ${SIZES.length} tree shapes`, async function () {
      const rng = createRng(0xbeef);
      let checked = 0;

      for (const size of SIZES) {
        const leaves = Array.from({ length: size }, (_, i) =>
          hashLeaf(`parity-${size}-${i}-${Math.floor(rng() * 1e9)}`),
        );
        const tree = buildMerkleTree(leaves);

        for (let i = 0; i < size; i += 1) {
          const proof = getProof(tree, i);

          // The folded root must match.
          expect(await verifier.processProof(leaves[i], proof)).to.equal(
            processProof(leaves[i], proof),
            `processProof disagreed at size=${size} index=${i}`,
          );

          // And the accept/reject decision must match.
          const onChain = await verifier.verifyAgainstRoot(leaves[i], proof, tree.root);
          const offChain = verifyProof(leaves[i], proof, tree.root);
          expect(onChain).to.equal(offChain, `verify disagreed at size=${size} index=${i}`);
          expect(onChain).to.equal(true);
          checked += 1;
        }
      }

      expect(checked).to.equal(SIZES.reduce((a, b) => a + b, 0));
    });

    it('agrees on rejection for tampered proofs', async function () {
      const rng = createRng(0xfeed);
      for (let round = 0; round < 60; round += 1) {
        const size = 2 + Math.floor(rng() * 30);
        const leaves = Array.from({ length: size }, (_, i) => hashLeaf(`tamper-${round}-${i}`));
        const tree = buildMerkleTree(leaves);
        const index = Math.floor(rng() * size);
        const proof = getProof(tree, index);
        if (proof.length === 0) continue;

        const tampered = [...proof];
        const at = Math.floor(rng() * tampered.length);
        tampered[at] = hashLeaf(`tampered-${round}-${at}`);

        const onChain = await verifier.verifyAgainstRoot(leaves[index], tampered, tree.root);
        const offChain = verifyProof(leaves[index], tampered, tree.root);
        expect(onChain).to.equal(offChain);
        expect(onChain).to.equal(false);
      }
    });

    it('agrees on rejection for foreign leaves', async function () {
      const rng = createRng(0xd00d);
      for (let round = 0; round < 40; round += 1) {
        const size = 2 + Math.floor(rng() * 20);
        const leaves = Array.from({ length: size }, (_, i) => hashLeaf(`foreign-${round}-${i}`));
        const tree = buildMerkleTree(leaves);
        const outsider = hashLeaf(`outsider-${round}`);
        const proof = getProof(tree, Math.floor(rng() * size));

        const onChain = await verifier.verifyAgainstRoot(outsider, proof, tree.root);
        expect(onChain).to.equal(verifyProof(outsider, proof, tree.root));
        expect(onChain).to.equal(false);
      }
    });

    it('agrees on truncated and extended proofs', async function () {
      const leaves = Array.from({ length: 16 }, (_, i) => hashLeaf(`len-${i}`));
      const tree = buildMerkleTree(leaves);
      const proof = getProof(tree, 5);

      const truncated = proof.slice(0, -1);
      expect(await verifier.verifyAgainstRoot(leaves[5], truncated, tree.root)).to.equal(
        verifyProof(leaves[5], truncated, tree.root),
      );

      const extended = [...proof, hashLeaf('extra')];
      expect(await verifier.verifyAgainstRoot(leaves[5], extended, tree.root)).to.equal(
        verifyProof(leaves[5], extended, tree.root),
      );
    });
  });

  describe('leaf hashing', function () {
    it('agrees with keccak256 over the same bytes', async function () {
      for (const value of ['hello', '', '🚀 日本語', 'x'.repeat(1000)]) {
        expect(hashLeaf(value)).to.equal(ethers.keccak256(ethers.toUtf8Bytes(value)));
      }
      const hex = `0x${'ab'.repeat(32)}`;
      expect(hashLeaf(hex)).to.equal(ethers.keccak256(hex));
    });
  });
});
