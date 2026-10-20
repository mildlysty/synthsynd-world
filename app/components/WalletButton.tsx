'use client';
import dynamic from 'next/dynamic';
const WalletMultiButtonDynamic = dynamic(async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton, { ssr: false });
export default function WalletButton() {
  return <WalletMultiButtonDynamic className="!bg-purple-600 !rounded-xl !w-full" />;
}