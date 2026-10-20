'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';
import { useWallet } from '@solana/wallet-adapter-react';

export default function Reviews({ agentId }: { agentId: string }) {
  const { publicKey } = useWallet();
  const [reviews, setReviews] = useState<any[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchReviews = async () => {
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });
    if (data) setReviews(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchReviews();
  }, [agentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey) return alert("Please connect your wallet to leave a review.");
    setSubmitting(true);

    const { error } = await supabase.from('reviews').insert([
      {
        agent_id: agentId,
        user_wallet: publicKey.toBase58(),
        rating: rating,
        comment: comment,
      },
    ]);

    if (error) {
      alert("Error posting review: " + error.message);
    } else {
      setComment(''); // clear form
      fetchReviews(); // reload list
    }
    setSubmitting(false);
  };

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, rev) => acc + rev.rating, 0) / reviews.length).toFixed(1)
    : "No ratings yet";

  return (
    <div className="mt-12 bg-gray-900 border border-gray-800 rounded-3xl p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Reviews</h2>
        <span className="text-xl font-bold text-yellow-400">
          ⭐ {averageRating}
        </span>
      </div>

      {/* REVIEW FORM */}
      {publicKey ? (
        <form onSubmit={handleSubmit} className="mb-8 bg-black p-4 rounded-xl border border-gray-800">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-gray-400">Rating:</span>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`text-2xl ${rating >= star ? 'text-yellow-400' : 'text-gray-600'}`}
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            required
            placeholder="Write your review..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500 mb-3"
            rows={3}
          />
          <button 
            type="submit" 
            disabled={submitting}
            className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg font-semibold transition disabled:opacity-50"
          >
            {submitting ? 'Posting...' : 'Post Review'}
          </button>
        </form>
      ) : (
        <p className="text-gray-400 mb-8 bg-black p-4 rounded-xl border border-gray-800">
          Connect your wallet to leave a review.
        </p>
      )}

      {/* REVIEW LIST */}
      {loading ? (
        <p className="text-gray-400">Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <p className="text-gray-400">No reviews yet. Be the first!</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((rev) => (
            <div key={rev.id} className="bg-black p-4 rounded-xl border border-gray-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-purple-400 font-mono">
                  {rev.user_wallet.slice(0, 4)}...{rev.user_wallet.slice(-4)}
                </span>
                <span className="text-yellow-400">
                  {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                </span>
              </div>
              <p className="text-gray-300">{rev.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}