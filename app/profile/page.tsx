'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';
import Link from 'next/link';
import WalletButton from '../components/WalletButton';

export default function ProfilePage() {
  const { publicKey } = useWallet();
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMyAgents() {
      if (!publicKey) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', publicKey.toBase58())
        .order('created_at', { ascending: false });

      if (!error && data) {
        setAgents(data);
      }
      setLoading(false);
    }

    fetchMyAgents();
  }, [publicKey]);

  // --- NEW DELETE FUNCTION ---
  const handleDelete = async (id: string) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this agent? This cannot be undone.");
    if (!confirmDelete) return;

    const { error } = await supabase.from('agents').delete().eq('id', id);
    
    if (error) {
      alert("Error deleting agent: " + error.message);
    } else {
      // Remove it from the screen instantly
      setAgents(agents.filter((agent) => agent.id !== id));
    }
  };

  return (
    <main className="min-h-screen bg-black text-white font-sans">
      <nav className="flex justify-between items-center p-6 border-b border-gray-800">
        <Link href="/" className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
          Synthsynd World
        </Link>
        <WalletButton />
      </nav>

      <section className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold mb-2">My Dashboard</h1>
        
        {publicKey ? (
          <p className="text-green-400 mb-8">Connected as: {publicKey.toBase58()}</p>
        ) : (
          <p className="text-red-400 mb-8">Please connect your wallet to view your agents.</p>
        )}

        {!publicKey ? (
          <div className="text-center py-20">
            <h2 className="text-2xl text-gray-400">Connect your wallet to see your created agents.</h2>
          </div>
        ) : loading ? (
          <div className="text-center py-20">
            <h2 className="text-2xl text-gray-400">Loading your agents...</h2>
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-20 bg-gray-900 rounded-2xl border border-gray-800">
            <h2 className="text-2xl text-gray-400 mb-4">You haven't created any agents yet.</h2>
            <Link href="/create" className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-xl font-bold transition">
              Create Your First Agent
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {agents.map((agent) => (
              <div key={agent.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-purple-500 transition shadow-lg shadow-purple-900/20 flex flex-col h-full">
                <div className="h-40 bg-gray-800 rounded-xl mb-4 overflow-hidden">
                  {agent.image_url ? (
                    <img src={agent.image_url} alt={agent.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">No Image</div>
                  )}
                </div>
                <h3 className="text-xl font-bold mb-2 truncate">{agent.name}</h3>
                <p className="text-gray-400 text-sm mb-4 line-clamp-2 flex-grow">{agent.description}</p>
                
                <div className="flex justify-between items-center mt-auto">
                  <span className="text-purple-400 font-bold">
                    {agent.is_free ? "FREE" : `${agent.price_usd || 0} $SSDY`}
                  </span>
                  
                  {/* VIEW AND DELETE BUTTONS */}
                  <div className="flex gap-2">
                    <Link href={`/agent/${agent.id}`} className="text-sm bg-gray-800 px-4 py-2 rounded-lg hover:bg-gray-700 transition">
                      View
                    </Link>
                    <button 
                      onClick={() => handleDelete(agent.id)} 
                      className="text-sm bg-red-900/50 text-red-400 px-4 py-2 rounded-lg hover:bg-red-800 hover:text-white transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}