'use client';
import { useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';

export default function ApiKeys() {
  const { publicKey } = useWallet();
  const [keys, setKeys] = useState<any[]>([]);

  const fetchKeys = async () => {
    if (!publicKey) return;
    const { data } = await supabase.from('api_keys').select('*').eq('user_id', publicKey.toBase58());
    if (data) setKeys(data);
  };

  useEffect(() => { fetchKeys(); }, [publicKey]);

  const generate = async () => {
    if (!publicKey) return;
    const newKey = 'ssdy_' + Math.random().toString(36).substring(2, 15);
    await supabase.from('api_keys').insert([{ user_id: publicKey.toBase58(), key: newKey }]);
    fetchKeys();
  };

  if (!publicKey) return <div className="p-10 text-center">Connect Wallet</div>;

  return (
    <div className="p-10 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">API Keys</h1>
      <button onClick={generate} className="bg-purple-600 px-6 py-3 rounded-xl font-bold mb-8">Generate New Key</button>
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        {keys.map(k => <div key={k.id} className="font-mono text-gray-300 py-2 border-b border-gray-800">{k.key}</div>)}
      </div>
    </div>
  );
}
