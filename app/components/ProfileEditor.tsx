'use client';
import { useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';

export default function ProfileEditor() {
  const { publicKey } = useWallet();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      if (!publicKey) return;
      const { data } = await supabase.from('profiles').select('username').eq('wallet_address', publicKey.toBase58()).single();
      if (data) setUsername(data.username || '');
    }
    load();
  }, [publicKey]);

  const save = async () => {
    if (!publicKey || !username) return;
    setLoading(true);
    await supabase.from('profiles').upsert({ wallet_address: publicKey.toBase58(), username: username.toLowerCase() });
    setLoading(false);
    alert("Username saved!");
  };

  if (!publicKey) return null;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8">
      <h2 className="text-xl font-bold mb-4">Your Profile</h2>
      <div className="flex gap-4 items-center">
        <span className="text-gray-400">@</span>
        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" className="bg-black border border-gray-700 rounded-lg p-2 text-white" />
        <button onClick={save} disabled={loading} className="bg-purple-600 px-4 py-2 rounded-lg font-bold">{loading ? 'Saving...' : 'Save'}</button>
      </div>
    </div>
  );
}