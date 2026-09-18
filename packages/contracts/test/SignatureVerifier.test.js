const { expect } = require('chai');
const { ethers } = require('hardhat');
const {
  addressForPrivateKey,
  hashMessageContent,
  SECP256K1_HALF_N,
  SECP256K1_N,
  signDigest,
} = require('@merkle-verify/core');

// Scheme enum, mirroring SignatureVerifier.SignatureScheme.
const ECDSA_RAW = 0;
const ECDSA_EIP191 = 1;
const SCHNORR = 2;
const RSA = 3;

const KEY = `0x${'11'.repeat(32)}`;
const SIGNER = addressForPrivateKey(KEY);

describe('SignatureVerifier', function () {
  let verifier;
  let digest;

  beforeEach(async function () {
    const factory = await ethers.getContractFactory('SignatureVerifier');
    verifier = await factory.deploy();
    await verifier.waitForDeployment();
    digest = hashMessageContent('Hello, Ethereum!');
  });

  describe('EIP-191 mode', function () {
    it('verifies a wallet-style signature — the case that used to fail', async function () {
      // The inherited suite signed with the EIP-191 prefix and verified against
      // the raw digest, so this assertion could never hold. It does now.
      const signature = await signDigest(KEY, digest, 'eip191');
      expect(await verifier.verifySignature(SIGNER, signature, digest, ECDSA_EIP191)).to.equal(
        true,
      );
    });

    it('recovers the signer address', async function () {
      const signature = await signDigest(KEY, digest, 'eip191');
      expect(await verifier.recoverSigner(signature, digest, ECDSA_EIP191)).to.equal(SIGNER);
    });

    it('matches the library prefix implementation', async function () {
      const expected = ethers.keccak256(
        ethers.concat([ethers.toUtf8Bytes('\x19Ethereum Signed Message:\n32'), digest]),
      );
      expect(await verifier.toEthSignedMessageHash(digest)).to.equal(expected);
    });
  });

  describe('raw mode', function () {
    it('verifies a signature made over the unprefixed digest', async function () {
      const signature = await signDigest(KEY, digest, 'raw');
      expect(await verifier.verifySignature(SIGNER, signature, digest, ECDSA_RAW)).to.equal(true);
    });
  });

  describe('the modes are not interchangeable', function () {
    it('rejects an EIP-191 signature checked as raw', async function () {
      const signature = await signDigest(KEY, digest, 'eip191');
      expect(await verifier.verifySignature(SIGNER, signature, digest, ECDSA_RAW)).to.equal(false);
    });

    it('rejects a raw signature checked as EIP-191', async function () {
      const signature = await signDigest(KEY, digest, 'raw');
      expect(await verifier.verifySignature(SIGNER, signature, digest, ECDSA_EIP191)).to.equal(
        false,
      );
    });
  });

  describe('rejections', function () {
    it('rejects a signature from a different key', async function () {
      const signature = await signDigest(`0x${'22'.repeat(32)}`, digest, 'eip191');
      expect(await verifier.verifySignature(SIGNER, signature, digest, ECDSA_EIP191)).to.equal(
        false,
      );
    });

    it('rejects a signature over a different message', async function () {
      const signature = await signDigest(KEY, digest, 'eip191');
      const other = hashMessageContent('Goodbye, Ethereum!');
      expect(await verifier.verifySignature(SIGNER, signature, other, ECDSA_EIP191)).to.equal(
        false,
      );
    });

    it('rejects a wrong-length signature', async function () {
      for (const bad of ['0x', '0xdeadbeef', `0x${'11'.repeat(64)}`, `0x${'11'.repeat(66)}`]) {
        expect(await verifier.verifySignature(SIGNER, bad, digest, ECDSA_EIP191)).to.equal(false);
      }
    });

    it('rejects an out-of-range v', async function () {
      const signature = await signDigest(KEY, digest, 'eip191');
      const mangled = `${signature.slice(0, -2)}05`;
      expect(await verifier.verifySignature(SIGNER, mangled, digest, ECDSA_EIP191)).to.equal(false);
    });

    it('rejects a malleable high-s signature', async function () {
      const signature = await signDigest(KEY, digest, 'eip191');
      const r = signature.slice(2, 66);
      const s = BigInt(`0x${signature.slice(66, 130)}`);
      const v = parseInt(signature.slice(130, 132), 16);
      // Flip (r, s, v) to its equally valid twin (r, n - s, v ^ 1).
      const flippedS = (SECP256K1_N - s).toString(16).padStart(64, '0');
      const flippedV = (v === 27 ? 28 : 27).toString(16).padStart(2, '0');
      const malleable = `0x${r}${flippedS}${flippedV}`;

      expect(BigInt(`0x${flippedS}`)).to.be.greaterThan(SECP256K1_HALF_N);
      expect(await verifier.verifySignature(SIGNER, malleable, digest, ECDSA_EIP191)).to.equal(
        false,
      );
      expect(await verifier.recoverSigner(malleable, digest, ECDSA_EIP191)).to.equal(
        ethers.ZeroAddress,
      );
    });

    it('rejects the zero address as an expected signer', async function () {
      const signature = await signDigest(KEY, digest, 'eip191');
      expect(
        await verifier.verifySignature(ethers.ZeroAddress, signature, digest, ECDSA_EIP191),
      ).to.equal(false);
    });
  });

  describe('unimplemented schemes revert rather than returning false', function () {
    it('reverts for Schnorr', async function () {
      const signature = await signDigest(KEY, digest, 'eip191');
      await expect(verifier.verifySignature(SIGNER, signature, digest, SCHNORR))
        .to.be.revertedWithCustomError(verifier, 'SchemeNotImplemented')
        .withArgs(SCHNORR);
    });

    it('reverts for RSA', async function () {
      const signature = await signDigest(KEY, digest, 'eip191');
      await expect(verifier.verifySignature(SIGNER, signature, digest, RSA))
        .to.be.revertedWithCustomError(verifier, 'SchemeNotImplemented')
        .withArgs(RSA);
    });

    it('reports which schemes are supported', async function () {
      expect(await verifier.isSchemeSupported(ECDSA_RAW)).to.equal(true);
      expect(await verifier.isSchemeSupported(ECDSA_EIP191)).to.equal(true);
      expect(await verifier.isSchemeSupported(SCHNORR)).to.equal(false);
      expect(await verifier.isSchemeSupported(RSA)).to.equal(false);
    });
  });

  describe('interoperability with wallet signers', function () {
    it('verifies a signature produced by an ethers Signer', async function () {
      const [account] = await ethers.getSigners();
      const signature = await account.signMessage(ethers.getBytes(digest));
      expect(
        await verifier.verifySignature(account.address, signature, digest, ECDSA_EIP191),
      ).to.equal(true);
    });
  });
});
