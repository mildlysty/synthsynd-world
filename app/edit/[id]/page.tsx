'use client';

import { supabase } from '../../../utils/supabase';
import { useRouter } from 'next/navigation';
import { useState, useEffect, use } from 'react';
import Link from 'next/link';

export default function EditAgent({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    price_usd: 0,
    is_free: false,
    demo_task: '',
    demo_steps: '',
    demo_result: '',
  });

  useEffect(() => {
    async function fetchAgent() {
      const { data: auth } = await supabase.auth.getSession();
      const owner = auth.session?.user.id ?? null;
      setOwnerId(owner);
      if (!owner) {
        setLoadError('Sign in to edit your listings.');
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('agents')
        .select('id,name,description,image_url,price_usd,is_free,owner_id,vault_mode,token_address,demo_task,demo_steps,demo_result')
        .eq('id', resolvedParams.id)
        .eq('owner_id', owner)
        .single();

      if (data) {
        let description = data.description || '';
        if (data.vault_mode && data.token_address && auth.session?.access_token) {
          const response = await fetch(`/api/v1/items/${encodeURIComponent(data.id)}`, { headers: { Authorization: `Bearer ${auth.session.access_token}` }, cache: 'no-store' });
          const result = await response.json().catch(() => null);
          if (response.ok && typeof result?.item?.description === 'string') description = result.item.description;
        }
        setFormData({
          name: data.name || '',
          description,
          image_url: data.image_url || '',
          price_usd: data.price_usd || 0,
          is_free: data.is_free || false,
          demo_task: data.demo_task || '',
          demo_steps: Array.isArray(data.demo_steps) ? data.demo_steps.join('\n') : '',
          demo_result: data.demo_result || '',
        });
      } else setLoadError(error?.message || 'Listing not found or you do not own it.');
      setLoading(false);
    }
    fetchAgent();
  }, [resolvedParams.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerId) return setLoadError('Sign in to edit your listings.');
    const demoParts = [formData.demo_task.trim(), formData.demo_steps.trim(), formData.demo_result.trim()];
    if (demoParts.some(Boolean) && !demoParts.every(Boolean)) {
      setLoadError('Complete the sample task, steps, and result together, or leave all three blank.');
      return;
    }
    setLoadError('');
    setSaving(true);

    try {
      const { error } = await supabase
        .from('agents')
        .update({
          name: formData.name,
          description: formData.description,
          image_url: formData.image_url || null,
          price_usd: formData.is_free ? 0 : formData.price_usd,
          is_free: formData.is_free,
          demo_task: formData.demo_task.trim() || null,
          demo_steps: formData.demo_steps.split('\n').map(step => step.trim()).filter(Boolean).slice(0, 8),
          demo_result: formData.demo_result.trim() || null,
        })
        .eq('id', resolvedParams.id)
        .eq('owner_id', ownerId);

      if (error) throw new Error(error.message);

      router.push('/profile');
      router.refresh();
    } catch (err: any) {
      alert("Error updating agent: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-black px-4 py-6 text-white flex justify-center sm:p-10">Loading...</div>;

  return (
    <main className="min-h-screen bg-black px-4 py-6 font-sans text-white sm:p-10">
      <div className="max-w-2xl mx-auto">
        <Link href="/profile" className="text-purple-400 mb-8 inline-block hover:underline">
          &larr; Back to Dashboard
        </Link>
        
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8">
          <h1 className="text-3xl font-bold mb-8">Edit Agent</h1>
          {loadError && <p role="alert" className="mb-5 rounded-xl border border-rose-900 bg-rose-950/30 p-4 text-sm text-rose-200">{loadError}</p>}
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Agent Name</label>
              <input 
                required type="text" value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Description</label>
              <textarea 
                required rows={4} value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Image URL (Optional)</label>
              <input 
                type="url" value={formData.image_url}
                onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-4 bg-black p-4 rounded-lg border border-gray-800">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" checked={formData.is_free}
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
                  required type="number" min="0" step="0.01" value={formData.price_usd}
                  onChange={(e) => setFormData({...formData, price_usd: parseFloat(e.target.value)})}
                  className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
            )}

            <details className="rounded-xl border border-gray-800 bg-black/40 p-4"><summary className="cursor-pointer font-semibold text-gray-200">Guided example (optional)</summary><p className="mt-2 text-xs leading-5 text-gray-500">Add a creator-written task, steps, and example result. Visitors see it as a walkthrough, not a live agent run.</p><label className="mt-4 block text-sm text-gray-400">Sample task<textarea maxLength={1200} rows={3} value={formData.demo_task} placeholder="What should a visitor ask this agent to do?" className="mt-2 w-full rounded-lg border border-gray-700 bg-black p-3" onChange={e => setFormData({...formData, demo_task: e.target.value})} /></label><label className="mt-4 block text-sm text-gray-400">Steps (one per line, up to 8)<textarea maxLength={2400} rows={4} value={formData.demo_steps} placeholder="Describe the agent workflow, one step per line." className="mt-2 w-full rounded-lg border border-gray-700 bg-black p-3" onChange={e => setFormData({...formData, demo_steps: e.target.value})} /></label><label className="mt-4 block text-sm text-gray-400">Example result<textarea maxLength={3000} rows={4} value={formData.demo_result} placeholder="Add an example output for this sample task." className="mt-2 w-full rounded-lg border border-gray-700 bg-black p-3" onChange={e => setFormData({...formData, demo_result: e.target.value})} /></label></details>
            <button 
              type="submit" disabled={saving}
              className="mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
