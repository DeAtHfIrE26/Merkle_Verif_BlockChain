// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SignatureVerifier {
    enum SignatureScheme { ECDSA, SCHNORR, RSA }

    /**
     * @notice Verifies a signature according to the specified signature scheme.
     * @param signer The address of the signer.
     * @param signature The signature bytes.
     * @param signedHash The hash of the signed message.
     * @param schemeType The type of signature scheme used.
     * @return success True if the signature is valid and recovered address matches signer, else false.
     */
    function verifySignature(
        address signer,
        bytes memory signature,
        bytes32 signedHash,
        SignatureScheme schemeType
    ) public pure returns (bool success) {
        if (schemeType == SignatureScheme.ECDSA) {
            // ECDSA signature verification
            if (signature.length != 65) {
                return false;
            }

            bytes32 r;
            bytes32 s;
            uint8 v;

            // Extract r, s, v from the signature
            assembly {
                r := mload(add(signature, 32))
                s := mload(add(signature, 64))
                v := byte(0, mload(add(signature, 96)))
            }

            // EIP-2 still allows signature malleability for ecrecover(). Remove this possibility
            if (uint256(s) > 0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff) {
                return false;
            }

            // If v is not 27 or 28, return false
            if (v != 27 && v != 28) {
                return false;
            }

            // Recover the address
            address recoveredAddress = ecrecover(signedHash, v, r, s);

            // Check if recovered address matches signer
            return (recoveredAddress == signer);
        } else if (schemeType == SignatureScheme.SCHNORR) {
            // Placeholder for Schnorr signature verification
            // Implement Schnorr verification logic here
            // Return false for now as it's not implemented
            return false;
        } else if (schemeType == SignatureScheme.RSA) {
            // Placeholder for RSA signature verification
            // Implement RSA verification logic here
            // Return false for now as it's not implemented
            return false;
        } else {
            // Unknown signature scheme
            return false;
        }
    }
}
