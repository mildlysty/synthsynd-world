import { supabase } from '../../../utils/supabase';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  // Await params for Next.js 15+ compatibility
  const resolvedParams = await params;
  
  const { data: agent, error } = await supabase
    .from('agents')
    .select('*')
    .eq('id', resolvedParams.id)
    .single();

  if (error || !agent) {
    notFound(); // Shows a 404 if the agent doesn't exist
  }

  return (
    <main className="min-h-screen bg-black text-white font-sans p-10">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-purple-400 mb-8 inline-block hover:underline">
          &larr; Back to Marketplace
        </Link>
        
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-1/3 h-64 bg-gray-800 rounded-2xl overflow-hidden">
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
          
          <div className="w-full md:w-2/3">
            <h1 className="text-4xl font-bold mb-4">{agent.name}</h1>
            <p className="text-gray-300 text-lg mb-8 whitespace-pre-wrap">{agent.description}</p>
            
            <div className="bg-gray-800 p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Price</p>
                <p className="text-2xl text-purple-400 font-bold">
                  {agent.is_free ? "FREE" : `${agent.price_usd || 0} $SSDY`}
                </p>
              </div>
              <button className="bg-purple-600 hover:bg-purple-700 px-8 py-3 rounded-xl font-bold text-lg transition">
                Buy Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}