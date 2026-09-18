// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MerkleVerifier
 * @notice Stores a Merkle root and verifies sorted-pair inclusion proofs
 *         against it.
 *
 * @dev The scheme is sorted-pair keccak256: a parent hashes its two children
 *      concatenated in ascending byte order, so a proof needs no left/right
 *      flags. `packages/core` implements the same scheme in TypeScript and
 *      `test/parity.test.js` asserts the two agree on randomised trees.
 *
 *      SECURITY NOTE: because leaves and internal nodes are both 32 bytes, an
 *      internal node can be presented as a leaf and will verify. That is a
 *      property of this scheme, not a defect in this contract. Callers that
 *      need leaves to be unforgeable should hash leaf data twice before
 *      building the tree.
 */
contract MerkleVerifier is Ownable {
    /// @notice The current root that `verify` checks against.
    bytes32 public merkleRoot;

    event MerkleRootUpdated(bytes32 indexed previousRoot, bytes32 indexed newMerkleRoot);

    error EmptyMerkleRoot();

    /// @notice Replace the stored root. Owner only.
    function setMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
        if (_merkleRoot == bytes32(0)) revert EmptyMerkleRoot();
        bytes32 previous = merkleRoot;
        merkleRoot = _merkleRoot;
        emit MerkleRootUpdated(previous, _merkleRoot);
    }

    /// @notice True if `proof` proves `leaf` is under the stored root.
    function verify(bytes32 leaf, bytes32[] calldata proof) external view returns (bool) {
        return _verify(leaf, proof, merkleRoot);
    }

    /**
     * @notice True if `proof` proves `leaf` is under `root`.
     * @dev Pure and stateless, so a caller can verify against any root without
     *      the owner having to publish it first. This is what lets the web app
     *      offer on-chain verification for trees a visitor built themselves.
     */
    function verifyAgainstRoot(
        bytes32 leaf,
        bytes32[] calldata proof,
        bytes32 root
    ) external pure returns (bool) {
        return _verify(leaf, proof, root);
    }

    /// @notice Fold a proof from `leaf` upward and return the root it implies.
    function processProof(bytes32 leaf, bytes32[] calldata proof) external pure returns (bytes32) {
        return _processProof(leaf, proof);
    }

    function _verify(
        bytes32 leaf,
        bytes32[] memory proof,
        bytes32 root
    ) internal pure returns (bool) {
        if (root == bytes32(0)) return false;
        return _processProof(leaf, proof) == root;
    }

    function _processProof(bytes32 leaf, bytes32[] memory proof) internal pure returns (bytes32) {
        bytes32 computedHash = leaf;
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];
            computedHash = computedHash <= proofElement
                ? keccak256(abi.encodePacked(computedHash, proofElement))
                : keccak256(abi.encodePacked(proofElement, computedHash));
        }
        return computedHash;
    }
}
