import type { Metadata } from 'next';
import { TransferTracker } from '@/components/TransferTracker';

export const metadata: Metadata = {
  title: 'Transfer Tracker (Simulated)',
  description:
    'A token transfer feed rendered from simulated data, shown alongside the subgraph query and schema a live deployment would use.',
};

export default function TransfersPage() {
  return <TransferTracker />;
}
