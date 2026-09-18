import type { Metadata } from 'next';
import { SignatureWorkbenchLoader } from '@/components/SignatureWorkbenchLoader';

export const metadata: Metadata = {
  title: 'Signature Verifier',
  description:
    'Sign a message with a throwaway key generated in your browser and recover the signer, with EIP-191 and raw ECDSA modes compared side by side.',
};

export default function SignaturesPage() {
  return <SignatureWorkbenchLoader />;
}
