import WalletButton from './components/WalletButton';
import { supabase } from '../utils/supabase';
import Link from 'next/link';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const resolvedParams = await searchParams;
  const currentPage = Number(resolvedParams.page) || 1;
  const searchQuery = resolvedParams.q || '';
  const itemsPerPage = 12;
  
  const from = (currentPage - 1) * itemsPerPage;
  const to = from + itemsPerPage - 1;

  // Build the Supabase query
  let query = supabase.from('agents').select('*', { count: 'exact' }).order('created_at', { ascending: false });
  if (searchQuery) {
    query = query.ilike('name', `%${searchQuery}%`);
  }

  const { data: agents, count, error } = await query.range(from, to);
  const totalPages = count ? Math.ceil(count / itemsPerPage) : 1;

  if (error) {
    console.error("Error fetching data:", error);
  }

  return (
    <main className="min-h-screen bg-black text-white font-sans">
      <nav className="flex flex-col md:flex-row justify-between items-center p-6 border-b border-gray-800 gap-4">
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
          Synthsynd World
        </h1>
        
        {/* SEARCH FORM */}
        <form className="flex w-full md:w-1/3 gap-2" action="/">
          <input 
            type="text" 
            name="q" 
            defaultValue={searchQuery}
            placeholder="Search agents..." 
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
          />
          <button type="submit" className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-semibold transition">
            Search
          </button>
        </form>

                {/* NAVIGATION BUTTONS */}
        <div className="flex items-center gap-4">
          <Link href="/create" className="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-full font-semibold transition">
            Create Agent
          </Link>
          <WalletButton />
        </div>

      <section className="flex flex-col items-center justify-center text-center py-16 px-4">
        <h2 className="text-5xl font-extrabold mb-6">
          The Future of AI Agents
        </h2>
        <p className="text-gray-400 text-xl mb-8 max-w-2xl">
          Discover, buy, and sell autonomous AI agents with $SSDY.
        </p>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        {agents && agents.length > 0 ? (
          agents.map((agent) => (
            <div key={agent.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-purple-500 transition shadow-lg shadow-purple-900/20 flex flex-col h-full">
              <div className="h-40 bg-gray-800 rounded-xl mb-4 overflow-hidden">
                {agent.image_url ? (
                  <img 
                    src={agent.image_url} 
                    alt={agent.name} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                  />
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
                <Link href={`/agent/${agent.id}`} className="text-sm bg-gray-800 px-4 py-2 rounded-lg hover:bg-gray-700 transition">
                  View
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-3 text-center text-gray-500 py-10 text-xl">
            No agents found for "{searchQuery}".
          </div>
        )}
      </section>

      {/* PAGINATION */}
      <section className="flex justify-center items-center gap-4 pb-20">
        {currentPage > 1 && (
          <Link 
            href={`/?page=${currentPage - 1}${searchQuery ? `&q=${searchQuery}` : ''}`}
            className="bg-gray-800 px-6 py-2 rounded-lg hover:bg-gray-700 transition"
          >
            Previous
          </Link>
        )}
        
        <span className="text-gray-400 font-semibold">
          Page {currentPage} of {totalPages}
        </span>

        {currentPage < totalPages && (
          <Link 
            href={`/?page=${currentPage + 1}${searchQuery ? `&q=${searchQuery}` : ''}`}
            className="bg-gray-800 px-6 py-2 rounded-lg hover:bg-gray-700 transition"
          >
            Next
          </Link>
        )}
      </section>
    </main>
  );
}