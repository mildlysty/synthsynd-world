import type { Metadata } from 'next';
import SynthsyndPad from '../components/SynthsyndPad';

export const metadata: Metadata = {
  title: 'SynthsyndPad — Launch a token for your listing',
  description: 'Prepare a token launch for a Synthsynd World listing and review the transaction in your own Solana wallet.',
};

export default function SynthsyndPadPage() {
  return <SynthsyndPad />;
}
