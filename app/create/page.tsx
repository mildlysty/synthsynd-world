'use client';
import { useWallet } from '@solana/wallet-adapter-react';
import Link from 'next/link';
import { supabase } from '../../utils/supabase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

export default function Create() {
  const { publicKey } = useWallet();
  const [session, setSession] = useState<Session | null>(null);
  const router = useRouter();
  const [form, setForm] = useState({ name: '', desc: '', img: '', mcpUrl: '', x402Url: '', content: '', category: '', tags: '', language: '', price: 0.01, free: true, type: 'agent', demoTask: '', demoSteps: '', demoResult: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const name = params.get('name');
    const type = params.get('type');
    if (type && ['agent', 'prompt', 'tool', 'mcp', 'skill'].includes(type)) {
      setForm(current => ({ ...current, type, ...(name ? { name } : {}) }));
    } else if (name) {
      setForm(current => ({ ...current, name }));
    }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return setError('Sign in with Google or X before publishing.');
    const demoParts = [form.demoTask.trim(), form.demoSteps.trim(), form.demoResult.trim()];
    if (form.type === 'agent' && demoParts.some(Boolean) && !demoParts.every(Boolean)) {
      return setError('Complete the sample task, steps, and result together, or leave all three blank.');
    }
    setSaving(true); setError('');
    const { error: insertError } = await supabase.from('agents').insert({
      id: crypto.randomUUID(),
      name: form.name.trim(), description: form.desc.trim(), image_url: form.img.trim() || null,
      price_usd: form.free ? 0 : form.price, is_free: form.free,
      user_id: publicKey?.toBase58() ?? session.user.id, owner_id: session.user.id,
      created_at: new Date().toISOString(), statusType: form.type,
      category: form.category.trim() || null,
      tags: form.tags.split(',').map(tag => tag.trim()).filter(Boolean).slice(0, 20),
      language: form.language.trim() || null,
      ...(form.type === 'agent' ? {
        agent_code: form.content,
        demo_task: form.demoTask.trim() || null,
        demo_steps: form.demoSteps.split('\n').map(step => step.trim()).filter(Boolean).slice(0, 8),
        demo_result: form.demoResult.trim() || null,
      } : {}),
      ...(form.type === 'prompt' ? { prompt_body: form.content } : {}),
      ...(form.type === 'tool' ? { tool_code: form.content } : {}),
      ...(form.type === 'skill' ? { skill_content: form.content } : {}),
      ...(form.type === 'mcp' ? { mcp_server_url: form.mcpUrl.trim() } : {}),
      ...(form.x402Url.trim() ? { x402_url: form.x402Url.trim() } : {})
    });
    setSaving(false);
    if (insertError) return setError(`Could not publish item: ${insertError.message}`);
    router.push('/marketplace');
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:p-10">
      <h1 className="text-3xl font-bold mb-8">Publish</h1>
      {!session && <p className="mb-5 rounded-xl border border-amber-900 bg-amber-950/30 p-4 text-sm text-amber-200">Sign in to publish a listing. A wallet is optional unless you later launch a token. <Link href="/signin" className="underline">Sign in with Google or X</Link>.</p>}
      {error && <p role="alert" className="mb-5 rounded-xl border border-rose-900 bg-rose-950/30 p-4 text-sm text-rose-200">{error}</p>}
      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-gray-800 bg-gray-900 p-4 sm:p-8">
        <input required placeholder="Name" value={form.name} className="w-full p-3 bg-black border border-gray-700 rounded-lg" onChange={e => setForm({...form, name: e.target.value})} />
        <textarea required placeholder="Description" value={form.desc} className="w-full p-3 bg-black border border-gray-700 rounded-lg" onChange={e => setForm({...form, desc: e.target.value})} />
        <input type="url" placeholder="Image URL" value={form.img} className="w-full p-3 bg-black border border-gray-700 rounded-lg" onChange={e => setForm({...form, img: e.target.value})} />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-gray-300">Category<input maxLength={80} value={form.category} placeholder="e.g. Research" className="mt-2 w-full rounded-lg border border-gray-700 bg-black p-3" onChange={e => setForm({...form, category: e.target.value})} /></label>
          <label className="block text-sm text-gray-300">Language<input maxLength={40} value={form.language} placeholder="e.g. Python" className="mt-2 w-full rounded-lg border border-gray-700 bg-black p-3" onChange={e => setForm({...form, language: e.target.value})} /></label>
        </div>
        <label className="block text-sm text-gray-300">Tags<input maxLength={500} value={form.tags} placeholder="research, finance, automation" className="mt-2 w-full rounded-lg border border-gray-700 bg-black p-3" onChange={e => setForm({...form, tags: e.target.value})} /></label>
        <label className="block text-sm text-gray-300">Price (USD)
          <input type="number" min="0.01" step="0.01" value={form.price} disabled={form.free} required={!form.free} className="mt-2 w-full p-3 bg-black border border-gray-700 rounded-lg disabled:opacity-50" onChange={e => setForm({...form, price: Number(e.target.value)})} />
        </label>
        <label className="flex items-center gap-3 text-sm text-gray-300">
          <input type="checkbox" checked={form.free} onChange={e => setForm({...form, free: e.target.checked})} />
          Offer this item for free
        </label>
        <select value={form.type} className="w-full p-3 bg-black border border-gray-700 rounded-lg" onChange={e => setForm({...form, type: e.target.value})}>
          <option value="agent">Agent</option>
          <option value="prompt">Prompt</option>
          <option value="tool">Tool</option>
          <option value="skill">Skill</option>
          <option value="mcp">MCP server</option>
        </select>
        {form.type === 'agent' && <details className="rounded-xl border border-gray-800 bg-black/40 p-4"><summary className="cursor-pointer font-semibold text-gray-200">Add a guided example (optional)</summary><p className="mt-2 text-xs leading-5 text-gray-500">Show visitors a sample task, your workflow steps, and an example result. This is creator-written content, not a live agent run.</p><label className="mt-4 block text-sm text-gray-300">Sample task<textarea maxLength={1200} rows={3} value={form.demoTask} placeholder="What should a visitor ask this agent to do?" className="mt-2 w-full rounded-lg border border-gray-700 bg-black p-3" onChange={e => setForm({...form, demoTask: e.target.value})} /></label><label className="mt-4 block text-sm text-gray-300">Steps (one per line, up to 8)<textarea maxLength={2400} rows={4} value={form.demoSteps} placeholder={"1. Review the input\n2. Apply the agent's approach\n3. Check the result"} className="mt-2 w-full rounded-lg border border-gray-700 bg-black p-3" onChange={e => setForm({...form, demoSteps: e.target.value})} /></label><label className="mt-4 block text-sm text-gray-300">Example result<textarea maxLength={3000} rows={4} value={form.demoResult} placeholder="Add an example output for this sample task." className="mt-2 w-full rounded-lg border border-gray-700 bg-black p-3" onChange={e => setForm({...form, demoResult: e.target.value})} /></label></details>}
        {form.type !== 'mcp' && <label className="block text-sm text-gray-300">{form.type === 'prompt' ? 'Prompt content' : form.type === 'skill' ? 'Skill Markdown' : form.type === 'tool' ? 'Tool source code' : 'Agent source code'}
          <textarea required minLength={form.type === 'agent' || form.type === 'tool' ? 5 : 1} value={form.content} rows={10} placeholder={form.type === 'prompt' ? 'Write the prompt…' : form.type === 'skill' ? 'Paste the skill instructions in Markdown…' : 'Paste the source code…'} className="mt-2 w-full rounded-lg border border-gray-700 bg-black p-3 font-mono text-sm" onChange={e => setForm({...form, content: e.target.value})} />
        </label>}
        {form.type === 'mcp' && <input required type="url" value={form.mcpUrl} placeholder="MCP server URL (https://...)" className="w-full p-3 bg-black border border-gray-700 rounded-lg" onChange={e => setForm({...form, mcpUrl: e.target.value})} />}
        {['agent', 'tool', 'prompt'].includes(form.type) && <label className="block text-sm text-gray-300">x402 paid API URL (optional)<input type="url" value={form.x402Url} placeholder="https://api.example.com/paid-endpoint" className="mt-2 w-full rounded-lg border border-gray-700 bg-black p-3" onChange={e => setForm({...form, x402Url: e.target.value})} /><span className="mt-1 block text-xs text-gray-500">Users can invoke this endpoint with an EVM wallet. They review payment terms before signing.</span></label>}
        <button type="submit" disabled={!session || saving} className="w-full bg-purple-600 py-4 rounded-xl font-bold disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Publishing…' : 'Publish'}</button>
      </form>
    </div>
  );
}
