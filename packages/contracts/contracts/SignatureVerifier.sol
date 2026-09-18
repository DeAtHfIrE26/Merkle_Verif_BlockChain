// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/**
 * @title SignatureVerifier
 * @notice Recovers and checks secp256k1 ECDSA signatures, over either a raw
 *         32-byte digest or an EIP-191 prefixed one.
 *
 * @dev Two deliberate changes from the version this contract replaces:
 *
 *      1. The prefixing mode is now an explicit parameter. Previously the
 *         contract always ecrecovered the raw digest, while every caller that
 *         used a wallet or a library's `signMessage` produced an EIP-191
 *         signature. Verification could therefore never succeed for those
 *         callers, and the project's only happy-path test failed because of it.
 *
 *      2. Unimplemented schemes revert instead of returning false. Returning
 *         false conflated "this signature is invalid" with "this contract
 *         cannot check that kind of signature", which made a test suite that
 *         only ever asserted `false` appear to pass while verifying nothing.
 */
contract SignatureVerifier {
    /// @notice How the signed digest was prepared before signing.
    enum SignatureScheme {
        ECDSA_RAW,      // 0: ecrecover over the digest exactly as given
        ECDSA_EIP191,   // 1: ecrecover over keccak256("\x19Ethereum Signed Message:\n32" || digest)
        SCHNORR,        // 2: not implemented
        RSA             // 3: not implemented
    }

    /**
     * @dev Upper bound for a non-malleable `s`, equal to secp256k1's order
     *      divided by two.
     *
     *      Every signature (r, s) has a valid twin (r, n - s). Rejecting the
     *      upper half makes signatures unique, per EIP-2. The previous
     *      implementation compared against 2^255 - 1, which is larger than n/2
     *      and so still admitted a band of malleable signatures.
     */
    bytes32 private constant SECP256K1_HALF_N =
        0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0;

    /// @notice Thrown when a scheme is recognised but not implemented here.
    error SchemeNotImplemented(SignatureScheme scheme);

    /**
     * @notice Verify that `signature` over `digest` was produced by `signer`.
     * @param signer    Expected signer address.
     * @param signature 65-byte signature: r (32) ‖ s (32) ‖ v (1).
     * @param digest    The 32-byte digest that was signed.
     * @param scheme    Which scheme and prefixing mode to apply.
     * @return True only if the signature is well-formed, non-malleable, and
     *         recovers to `signer`.
     */
    function verifySignature(
        address signer,
        bytes memory signature,
        bytes32 digest,
        SignatureScheme scheme
    ) public pure returns (bool) {
        if (scheme == SignatureScheme.SCHNORR || scheme == SignatureScheme.RSA) {
            revert SchemeNotImplemented(scheme);
        }

        address recovered = recoverSigner(signature, digest, scheme);
        return recovered != address(0) && recovered == signer;
    }

    /**
     * @notice Recover the address that signed `digest`.
     * @return The recovered address, or address(0) if the signature is
     *         malformed or malleable.
     */
    function recoverSigner(
        bytes memory signature,
        bytes32 digest,
        SignatureScheme scheme
    ) public pure returns (address) {
        if (scheme == SignatureScheme.SCHNORR || scheme == SignatureScheme.RSA) {
            revert SchemeNotImplemented(scheme);
        }
        if (signature.length != 65) {
            return address(0);
        }

        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }

        // Reject the malleable upper half of the curve order (EIP-2).
        if (uint256(s) > uint256(SECP256K1_HALF_N)) {
            return address(0);
        }
        if (v != 27 && v != 28) {
            return address(0);
        }

        bytes32 signedHash = scheme == SignatureScheme.ECDSA_EIP191
            ? toEthSignedMessageHash(digest)
            : digest;

        // ecrecover returns address(0) on failure, which the caller treats as
        // "no signer recovered" rather than a match.
        return ecrecover(signedHash, v, r, s);
    }

    /**
     * @notice Apply the EIP-191 personal_sign prefix to a 32-byte digest.
     * @dev This is what wallets and `signMessage` hash before signing.
     */
    function toEthSignedMessageHash(bytes32 digest) public pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", digest));
    }

    /// @notice True if this contract can verify `scheme`.
    function isSchemeSupported(SignatureScheme scheme) external pure returns (bool) {
        return scheme == SignatureScheme.ECDSA_RAW || scheme == SignatureScheme.ECDSA_EIP191;
    }
}
