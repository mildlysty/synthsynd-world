'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';
import Link from 'next/link';

export default function ApiKeys() {
  const { publicKey } = useWallet();
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchKeys() {
      if (!publicKey) return;
      const { data } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', publicKey.toBase58())
        .order('created_at', { ascending: false });
      
      if (data) setKeys(data);
      setLoading(false);
    }
    fetchKeys();
  }, [publicKey]);

  const generateKey = async () => {
    if (!publicKey) return alert("Connect wallet first");
    
    // Generate a random 32-character key
    const newKey = 'ssdy_' + Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    const { error } = await supabase.from('api_keys').insert([
      { user_id: publicKey.toBase58(), key: newKey }
    ]);

    if (error) {
      alert("Error generating key: " + error.message);
    } else {
      const { data } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', publicKey.toBase58())
        .order('created_at', { ascending: false });
      if (data) setKeys(data);
    }
  };

  const deleteKey = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this API key?")) return;
    
    const { error } = await supabase.from('api_keys').delete().eq('id', id);
    if (!error) {
      setKeys(keys.filter(k => k.id !== id));
    }
  };

  if (!publicKey) {
    return (
      <div className="p-10 text-center">
        <h1 className="text-2xl font-bold mb-4">Please connect your wallet.</h1>
        <Link href="/" className="text-purple-400 hover:underline">Go to homepage</Link>
      </div>
    );
  }

  return (
    <div className="p-10 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">API Keys</h1>
      <p className="text-gray-400 mb-8">Manage your secret keys to access the Synthsynd API.</p>

      <button 
        onClick={generateKey}
        className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-xl font-bold transition mb-8"
      >
        Generate New Secret Key
      </button>

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : keys.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
          <p className="text-gray-400">You don't have any API keys yet.</p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-800 text-gray-400 text-sm">
              <tr>
                <th className="p-4">Secret Key</th>
                <th className="p-4">Created At</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-t border-gray-800">
                  <td className="p-4 font-mono text-sm">{k.key}</td>
                  <td className="p-4 text-gray-400 text-sm">
                    {new Date(k.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => deleteKey(k.id)}
                      className="text-red-400 hover:text-red-300 text-sm font-semibold"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}