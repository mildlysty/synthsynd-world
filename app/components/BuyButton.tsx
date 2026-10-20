'use client';

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useState } from 'react';

export default function BuyButton({ 
  sellerWallet, 
  price 
}: { 
  sellerWallet: string | null, 
  price: number 
}) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [buying, setBuying] = useState(false);

  const handleBuy = async () => {
    if (!publicKey) return alert("Please connect your wallet first!");
    if (!sellerWallet) return alert("This item has no seller wallet attached!");
    
    // Since $SSDY token isn't minted yet, we will just simulate the transaction for now
    try {
      setBuying(true);
      alert(`Preparing to buy for ${price} $SSDY. (Token launch pending)`);
    } catch (error: any) {
      alert("Transaction failed: " + error.message);
    } finally {
      setBuying(false);
    }
  };

  return (
    <button 
      onClick={handleBuy}
      disabled={buying}
      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition disabled:opacity-50 mt-4"
    >
      {buying ? 'Processing...' : `Buy Now for ${price} $SSDY`}
    </button>
  );
}