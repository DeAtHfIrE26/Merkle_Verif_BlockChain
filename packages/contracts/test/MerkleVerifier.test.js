const { expect } = require('chai');
const { ethers } = require('hardhat');
const {
  buildMerkleTree,
  getProof,
  hashLeaf,
  hashPair,
} = require('@merkle-verify/core');

const ZERO = ethers.ZeroHash;

describe('MerkleVerifier', function () {
  let verifier;
  let owner;
  let stranger;
  let tree;
  let leaves;

  beforeEach(async function () {
    [owner, stranger] = await ethers.getSigners();
    const factory = await ethers.getContractFactory('MerkleVerifier');
    verifier = await factory.deploy();
    await verifier.waitForDeployment();

    leaves = ['tx-a', 'tx-b', 'tx-c', 'tx-d'].map(hashLeaf);
    tree = buildMerkleTree(leaves);
    await verifier.setMerkleRoot(tree.root);
  });

  describe('root management', function () {
    it('stores the root', async function () {
      expect(await verifier.merkleRoot()).to.equal(tree.root);
    });

    it('emits MerkleRootUpdated with previous and new root', async function () {
      const next = hashLeaf('a different root');
      await expect(verifier.setMerkleRoot(next))
        .to.emit(verifier, 'MerkleRootUpdated')
        .withArgs(tree.root, next);
    });

    it('rejects a zero root', async function () {
      await expect(verifier.setMerkleRoot(ZERO)).to.be.revertedWithCustomError(
        verifier,
        'EmptyMerkleRoot',
      );
    });

    it('is owner-only', async function () {
      await expect(
        verifier.connect(stranger).setMerkleRoot(hashLeaf('nope')),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });

  describe('verify against the stored root', function () {
    it('accepts a valid proof for every leaf', async function () {
      for (let i = 0; i < leaves.length; i += 1) {
        expect(await verifier.verify(leaves[i], getProof(tree, i))).to.equal(true);
      }
    });

    it('rejects a leaf that is not in the tree', async function () {
      expect(await verifier.verify(hashLeaf('not-in-tree'), getProof(tree, 0))).to.equal(false);
    });

    it('rejects an empty proof', async function () {
      expect(await verifier.verify(leaves[0], [])).to.equal(false);
    });

    it('rejects a tampered proof element', async function () {
      const proof = getProof(tree, 1);
      proof[0] = hashLeaf('tampered');
      expect(await verifier.verify(leaves[1], proof)).to.equal(false);
    });

    it('rejects a reordered proof', async function () {
      const big = buildMerkleTree(Array.from({ length: 8 }, (_, i) => hashLeaf(`n-${i}`)));
      await verifier.setMerkleRoot(big.root);
      const proof = getProof(big, 3);
      expect(await verifier.verify(big.leaves[3], [...proof].reverse())).to.equal(false);
    });

    it('rejects everything once the root is changed', async function () {
      const proof = getProof(tree, 0);
      await verifier.setMerkleRoot(hashLeaf('some other root'));
      expect(await verifier.verify(leaves[0], proof)).to.equal(false);
    });

    it('returns false when no root has been set', async function () {
      const factory = await ethers.getContractFactory('MerkleVerifier');
      const fresh = await factory.deploy();
      await fresh.waitForDeployment();
      expect(await fresh.verify(leaves[0], getProof(tree, 0))).to.equal(false);
    });
  });

  describe('verifyAgainstRoot — stateless path used by the web app', function () {
    it('verifies against a caller-supplied root without touching storage', async function () {
      const other = buildMerkleTree(['x', 'y', 'z'].map(hashLeaf));
      expect(
        await verifier.verifyAgainstRoot(other.leaves[2], getProof(other, 2), other.root),
      ).to.equal(true);
      // The stored root is untouched.
      expect(await verifier.merkleRoot()).to.equal(tree.root);
    });

    it('rejects a mismatched root', async function () {
      expect(
        await verifier.verifyAgainstRoot(leaves[0], getProof(tree, 0), hashLeaf('wrong')),
      ).to.equal(false);
    });

    it('rejects a zero root', async function () {
      expect(await verifier.verifyAgainstRoot(leaves[0], getProof(tree, 0), ZERO)).to.equal(false);
    });

    it('is callable by anyone', async function () {
      expect(
        await verifier.connect(stranger).verifyAgainstRoot(leaves[0], getProof(tree, 0), tree.root),
      ).to.equal(true);
    });
  });

  describe('single-leaf tree', function () {
    it('treats the leaf as its own root', async function () {
      const single = buildMerkleTree([hashLeaf('only')]);
      await verifier.setMerkleRoot(single.root);
      expect(await verifier.verify(single.leaves[0], [])).to.equal(true);
    });
  });

  describe('processProof', function () {
    it('folds to the root', async function () {
      expect(await verifier.processProof(leaves[0], getProof(tree, 0))).to.equal(tree.root);
    });

    it('matches hashPair for a single step', async function () {
      const pair = buildMerkleTree([hashLeaf('l'), hashLeaf('r')]);
      expect(await verifier.processProof(pair.leaves[0], [pair.leaves[1]])).to.equal(
        hashPair(pair.leaves[0], pair.leaves[1]),
      );
    });
  });

  describe('second-preimage property', function () {
    it('an internal node verifies as though it were a leaf', async function () {
      // Documented, not hidden: this is inherent to sorted-pair trees.
      const internal = tree.layers[1][0];
      const sibling = tree.layers[1][1];
      expect(await verifier.verify(internal, [sibling])).to.equal(true);
    });
  });
});
