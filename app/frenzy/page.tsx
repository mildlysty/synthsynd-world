export default function Frenzy() {
  return (
    <div className="p-10">
      <h1 className="text-4xl font-bold text-red-500 mb-6">Frenzy Mode</h1>
      <p className="text-gray-400 mb-10 max-w-xl">Tokenize your agents and launch them on a live bonding curve. Earn 1% of all trading volume.</p>
      <div className="bg-gray-900 border border-gray-800 p-8 rounded-3xl max-w-md">
        <h2 className="text-2xl font-bold mb-4">Quick Launch</h2>
        <input placeholder="Agent Name" className="w-full p-3 bg-black border border-gray-700 rounded-lg mb-4" />
        <button className="w-full bg-red-600 font-bold py-3 rounded-xl">Launch Token</button>
      </div>
    </div>
  );
}