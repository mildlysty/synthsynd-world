'use client';

import { supabase } from '../../utils/supabase';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

export default function CreateAgent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    price_usd: 0,
    is_free: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Insert the new agent into Supabase
      const { error } = await supabase.from('agents').insert([
        {
          id: crypto.randomUUID(), // Generates a random UUID
          name: formData.name,
          description: formData.description,
          image_url: formData.image_url || null,
          price_usd: formData.is_free ? 0 : formData.price_usd,
          is_free: formData.is_free,
          user_id: '00000000-0000-0000-0000-000000000000', // Temporary ID
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) {
        throw new Error(error.message);
      }

      // Redirect back to the homepage after successful creation
      router.push('/');
      router.refresh(); // Force Next.js to fetch the new data

    } catch (err: any) {
      alert("Error creating agent: " + err.message);
    } finally {
      // This ALWAYS runs, whether it succeeds or fails
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white font-sans p-10">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-purple-400 mb-8 inline-block hover:underline">
          &larr; Back to Marketplace
        </Link>
        
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8">
          <h1 className="text-3xl font-bold mb-8">Create New Agent</h1>
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Agent Name</label>
              <input 
                required
                type="text" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-purple-500 focus:outline-none"
                placeholder="e.g. CodeBot Alpha"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Description</label>
              <textarea 
                required
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-purple-500 focus:outline-none"
                placeholder="Describe what this agent does..."
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Image URL (Optional)</label>
              <input 
                type="url" 
                value={formData.image_url}
                onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-purple-500 focus:outline-none"
                placeholder="https://example.com/image.png"
              />
            </div>

            <div className="flex items-center gap-4 bg-black p-4 rounded-lg border border-gray-800">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.is_free}
                  onChange={(e) => setFormData({...formData, is_free: e.target.checked})}
                  className="w-5 h-5 accent-purple-600"
                />
                <span>Make this agent FREE</span>
              </label>
            </div>

            {!formData.is_free && (
              <div>
                <label className="block text-sm text-gray-400 mb-2">Price in $SSDY</label>
                <input 
                  required
                  type="number" 
                  min="0"
                  step="0.01"
                  value={formData.price_usd}
                  onChange={(e) => setFormData({...formData, price_usd: parseFloat(e.target.value)})}
                  className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-purple-500 focus:outline-none"
                  placeholder="50"
                />
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Publish Agent'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}