import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import './globals.css';

const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

const SITE_NAME = 'Merkle Verify';
const DESCRIPTION =
  'Build Merkle trees, generate inclusion proofs and recover ECDSA signers — entirely in your browser, cross-checked against the same verification logic deployed on-chain.';

export const metadata: Metadata = {
  metadataBase: new URL('https://merkle-verif-blockchain.vercel.app'),
  title: { default: `${SITE_NAME} — Blockchain verification toolkit`, template: `%s · ${SITE_NAME}` },
  description: DESCRIPTION,
  keywords: ['Merkle proof', 'Merkle tree', 'ECDSA', 'EIP-191', 'Ethereum', 'Solidity', 'keccak256'],
  authors: [{ name: 'Kashyap Patel', url: 'https://github.com/DeAtHfIrE26' }],
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Blockchain verification toolkit`,
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — Blockchain verification toolkit`,
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#0A0B0D',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Nav />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
