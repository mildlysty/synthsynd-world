'use client';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '../../utils/supabase';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Create() {
  const { publicKey } = useWallet();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', desc: '', img: '', price: 0, free: false, type: 'agent' });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey) return alert('Connect Wallet');
    await supabase.from('agents').insert([{
      id: crypto.randomUUID(),
      name: form.name, description: form.desc, image_url: form.img,
      price_usd: form.free ? 0 : form.price, is_free: form.free,
      user_id: publicKey.toBase58(), created_at: new Date().toISOString(), statusType: form.type
    }]);
    router.push('/');
  };

  return (
    <div className="p-10 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Publish</h1>
      <form onSubmit={submit} className="space-y-4 bg-gray-900 p-8 rounded-2xl border border-gray-800">
        <input required placeholder="Name" className="w-full p-3 bg-black border border-gray-700 rounded-lg" onChange={e => setForm({...form, name: e.target.value})} />
        <textarea required placeholder="Description" className="w-full p-3 bg-black border border-gray-700 rounded-lg" onChange={e => setForm({...form, desc: e.target.value})} />
        <input placeholder="Image URL" className="w-full p-3 bg-black border border-gray-700 rounded-lg" onChange={e => setForm({...form, img: e.target.value})} />
        <select className="w-full p-3 bg-black border border-gray-700 rounded-lg" onChange={e => setForm({...form, type: e.target.value})}>
          <option value="agent">Agent</option>
          <option value="prompt">Prompt</option>
          <option value="tool">Tool</option>
        </select>
        <button type="submit" className="w-full bg-purple-600 py-4 rounded-xl font-bold">Publish</button>
      </form>
    </div>
  );
}