'use client';
import { useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import Link from 'next/link';

export default function Profile() {
  const { publicKey } = useWallet();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!publicKey) return;
    supabase.from('agents').select('*').eq('user_id', publicKey.toBase58()).then(({ data }) => { if (data) setItems(data); });
  }, [publicKey]);

  if (!publicKey) return <div className="p-10 text-center">Connect Wallet</div>;

  return (
    <div className="p-10">
      <h1 className="text-3xl font-bold mb-8">My Items</h1>
      <div className="grid grid-cols-3 gap-6">
        {items.map(i => (
          <div key={i.id} className="bg-gray-900 p-6 rounded-xl border border-gray-800">
            <h3 className="font-bold">{i.name}</h3>
            <Link href={`/agent/${i.id}`} className="text-purple-400 text-sm mt-4 block">View</Link>
          </div>
        ))}
      </div>
    </div>
  );
}