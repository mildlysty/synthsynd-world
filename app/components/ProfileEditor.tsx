'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';

export default function ProfileEditor() {
  const { publicKey } = useWallet();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      if (!publicKey) return;
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('wallet_address', publicKey.toBase58())
        .single();
      
      if (data) setUsername(data.username || '');
      setLoading(false);
    }
    loadProfile();
  }, [publicKey]);

  const saveUsername = async () => {
    if (!publicKey || !username.trim()) return;
    setSaving(true);
    
    // Save or update the profile
    const { error } = await supabase
      .from('profiles')
      .upsert({ 
        wallet_address: publicKey.toBase58(), 
        username: username.toLowerCase().replace(/\s+/g, '') 
      });

    if (error) {
      alert("Error saving username. It might already be taken.");
    } else {
      alert("Username saved successfully!");
    }
    setSaving(false);
  };

  if (!publicKey || loading) return null;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8">
      <h2 className="text-xl font-bold mb-4">Your Profile</h2>
      <div className="flex gap-4 items-center">
        <span className="text-gray-400">@</span>
        <input 
          type="text" 
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Choose a username"
          className="bg-black border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-purple-500"
        />
        <button 
          onClick={saveUsername}
          disabled={saving}
          className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-bold transition disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}