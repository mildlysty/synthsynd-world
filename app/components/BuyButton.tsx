'use client';
import { useWallet } from '@solana/wallet-adapter-react';

export default function BuyButton({ sellerWallet, price }: { sellerWallet: string, price: number }) {
  const { publicKey } = useWallet();
  return (
    <button onClick={() => alert(publicKey ? `Buying for ${price} $SSDY...` : 'Connect Wallet')} className="w-full bg-purple-600 py-3 rounded-xl font-bold">
      Buy Now
    </button>
  );
}