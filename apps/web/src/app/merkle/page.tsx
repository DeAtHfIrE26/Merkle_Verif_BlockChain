import type { Metadata } from 'next';
import { MerkleExplorer } from '@/components/MerkleExplorer';

export const metadata: Metadata = {
  title: 'Merkle Proof Explorer',
  description:
    'Build a Merkle tree from any values, generate an inclusion proof for any leaf, verify it, and tamper with it to see verification fail.',
};

export default function MerklePage() {
  return <MerkleExplorer />;
}
