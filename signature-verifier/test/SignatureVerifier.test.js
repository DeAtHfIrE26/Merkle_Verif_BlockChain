// test/SignatureVerifier.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SignatureVerifier", function () {
  let SignatureVerifier;
  let signatureVerifier;
  let signer;

  beforeEach(async function () {
    SignatureVerifier = await ethers.getContractFactory("SignatureVerifier");
    signatureVerifier = await SignatureVerifier.deploy();
    await signatureVerifier.deployed();

    [signer] = await ethers.getSigners();
  });

  it("Should verify a valid ECDSA signature", async function () {
    const message = "Hello, Ethereum!";
    const signedHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(message));

    // Sign the hash
    const signature = await signer.signMessage(ethers.utils.arrayify(signedHash));

    // Verify the signature
    const isValid = await signatureVerifier.verifySignature(
      signer.address,
      signature,
      signedHash,
      0 // SignatureScheme.ECDSA
    );

    expect(isValid).to.equal(true);
  });

  it("Should fail verification with invalid signature", async function () {
    const message = "Hello, Ethereum!";
    const signedHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(message));

    // Sign the hash
    const signature = await signer.signMessage(ethers.utils.arrayify(signedHash));

    // Modify the signature (e.g., change last byte)
    let modifiedSignature = signature.slice(0, -1) + (signature.slice(-1) === '0' ? '1' : '0');

    // Verify the modified signature
    const isValid = await signatureVerifier.verifySignature(
      signer.address,
      modifiedSignature,
      signedHash,
      0 // SignatureScheme.ECDSA
    );

    expect(isValid).to.equal(false);
  });

  it("Should fail verification if signer address does not match", async function () {
    const message = "Hello, Ethereum!";
    const signedHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(message));

    // Sign the hash with the signer
    const signature = await signer.signMessage(ethers.utils.arrayify(signedHash));

    // Verify with a different address
    const differentAddress = ethers.Wallet.createRandom().address;

    const isValid = await signatureVerifier.verifySignature(
      differentAddress,
      signature,
      signedHash,
      0 // SignatureScheme.ECDSA
    );

    expect(isValid).to.equal(false);
  });

  it("Should fail verification with wrong scheme type", async function () {
    const message = "Hello, Ethereum!";
    const signedHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(message));

    // Sign the hash
    const signature = await signer.signMessage(ethers.utils.arrayify(signedHash));

    // Use wrong scheme type (e.g., SignatureScheme.SCHNORR)
    const isValid = await signatureVerifier.verifySignature(
      signer.address,
      signature,
      signedHash,
      1 // SignatureScheme.SCHNORR
    );

    expect(isValid).to.equal(false);
  });

  // Additional tests can be added for other signature schemes once implemented
});
