// test/MerkleVerifier.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");
const keccak256 = require('keccak256');
const { MerkleTree } = require('merkletreejs');

describe("MerkleVerifier", function () {
  let MerkleVerifier, merkleVerifier, owner, addr1;
  const transactions = [
    "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"
  ];
  let merkleTree, merkleRoot;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    MerkleVerifier = await ethers.getContractFactory("MerkleVerifier");
    merkleVerifier = await MerkleVerifier.deploy();
    await merkleVerifier.deployed();

    const leaves = transactions.map(tx => keccak256(tx));
    merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    merkleRoot = merkleTree.getHexRoot();

    await merkleVerifier.setMerkleRoot(merkleRoot);
  });

  it("Should store the correct Merkle Root", async function () {
    expect(await merkleVerifier.merkleRoot()).to.equal(merkleRoot);
  });

  it("Should verify a valid transaction inclusion", async function () {
    const targetTx = transactions[0];
    const leaf = keccak256(targetTx);
    const proof = merkleTree.getHexProof(leaf);
    expect(await merkleVerifier.verify(leaf, proof)).to.equal(true);
  });

  it("Should fail verification for an invalid transaction", async function () {
    const fakeTx = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
    const leaf = keccak256(fakeTx);
    const proof = merkleTree.getHexProof(leaf);
    expect(await merkleVerifier.verify(leaf, proof)).to.equal(false);
  });

  it("Only owner can set the Merkle Root", async function () {
    const newRoot = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("new root"));
    await expect(
      merkleVerifier.connect(addr1).setMerkleRoot(newRoot)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("Should emit MerkleRootUpdated event upon setting root", async function () {
    const newRoot = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("another root"));
    await expect(merkleVerifier.setMerkleRoot(newRoot))
      .to.emit(merkleVerifier, 'MerkleRootUpdated')
      .withArgs(newRoot);
  });

  it("Should fail verification with an empty proof", async function () {
    const targetTx = transactions[0];
    const leaf = keccak256(targetTx);
    const emptyProof = [];
    expect(await merkleVerifier.verify(leaf, emptyProof)).to.equal(false);
  });

  it("Should fail verification with a malformed proof", async function () {
    const targetTx = transactions[0];
    const leaf = keccak256(targetTx);
    const malformedProof = [keccak256("0x123"), keccak256("0x456")];
    expect(await merkleVerifier.verify(leaf, malformedProof)).to.equal(false);
  });

  it("Should fail verification if Merkle Root is incorrect", async function () {
    const targetTx = transactions[0];
    const leaf = keccak256(targetTx);
    const proof = merkleTree.getHexProof(leaf);
    const fakeRoot = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("fake root"));
    await merkleVerifier.setMerkleRoot(fakeRoot);
    expect(await merkleVerifier.verify(leaf, proof)).to.equal(false);
  });
});
