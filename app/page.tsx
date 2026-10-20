import { supabase } from '../utils/supabase';
import Link from 'next/link';

export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string; type?: string }> }) {
  const params = await searchParams;
  const q = params.q || '';
  const type = params.type || 'all';

  let query = supabase.from('agents').select('*').order('created_at', { ascending: false }).limit(12);
  if (q) query = query.ilike('name', `%${q}%`);
  if (type !== 'all') query = query.eq('statusType', type);
  
  const { data: agents } = await query;

  return (
    <div className="p-10 max-w-7xl mx-auto">
      <form className="flex gap-2 mb-10" action="/">
        <input name="q" defaultValue={q} placeholder="Search agents..." className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 w-full max-w-md" />
        <button className="bg-purple-600 px-6 py-2 rounded-lg font-bold">Search</button>
      </form>

      <div className="flex gap-4 mb-8">
        {['all', 'agent', 'prompt', 'tool'].map(t => (
          <Link key={t} href={`/?type=${t}`} className={`px-4 py-2 rounded-lg font-bold ${type === t ? 'bg-purple-600' : 'bg-gray-900'}`}>{t}</Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {agents?.map(agent => (
          <div key={agent.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col">
            <div className="h-32 bg-gray-800 rounded-lg mb-4 overflow-hidden">
              {agent.image_url && <img src={agent.image_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
            </div>
            <h3 className="font-bold truncate">{agent.name}</h3>
            <p className="text-gray-500 text-sm line-clamp-2">{agent.description}</p>
            <div className="mt-auto pt-4 flex justify-between items-center">
              <span className="text-purple-400 font-bold">{agent.is_free ? 'FREE' : `${agent.price_usd} $SSDY`}</span>
              <Link href={`/agent/${agent.id}`} className="bg-gray-800 px-3 py-1 rounded">View</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}