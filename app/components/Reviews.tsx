"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../utils/supabase";

type Review = { id: string; reviewer_id: string; rating: number; comment: string; created_at: string; username?: string | null };

export default function Reviews({ agentId }: { agentId: string }) {
  const [session, setSession] = useState<Session | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadReviews = useCallback(async () => {
    const { data, error: queryError } = await supabase.from("marketplace_reviews")
      .select("id,reviewer_id,rating,comment,created_at").eq("listing_id", agentId)
      .order("created_at", { ascending: false });
    if (queryError) { setError("Could not load reviews. Apply the account migration to enable reviews."); setLoading(false); return; }
    const reviewerIds = [...new Set((data ?? []).map((review) => review.reviewer_id))];
    const { data: profiles } = reviewerIds.length ? await supabase.from("marketplace_profiles")
      .select("owner_id,username,display_name").in("owner_id", reviewerIds) : { data: [] };
    const names = new Map((profiles ?? []).map((profile) => [profile.owner_id, profile.display_name || profile.username]));
    setReviews((data ?? []).map((review) => ({ ...review, username: names.get(review.reviewer_id) ?? null })));
    setLoading(false);
  }, [agentId]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    loadReviews();
    return () => listener.subscription.unsubscribe();
  }, [loadReviews]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!session) return;
    setSubmitting(true); setError("");
    const { error: insertError } = await supabase.from("marketplace_reviews").upsert({
      listing_id: agentId, reviewer_id: session.user.id, rating, comment: comment.trim(), updated_at: new Date().toISOString(),
    }, { onConflict: "listing_id,reviewer_id" });
    if (insertError) setError(`Could not save review: ${insertError.message}`);
    else { setComment(""); await loadReviews(); }
    setSubmitting(false);
  }

  const average = reviews.length ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1) : null;
  return <section className="mt-12 rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8">
    <div className="flex items-center justify-between"><h2 className="text-2xl font-bold">Reviews</h2><span className="text-sm text-amber-300">{average ? `★ ${average} · ${reviews.length}` : "No reviews yet"}</span></div>
    {error&&<p role="alert" className="mt-5 rounded-xl border border-rose-900 bg-rose-950/30 p-3 text-sm text-rose-200">{error}</p>}
    {session?<form onSubmit={submit} className="mt-6 rounded-2xl border border-zinc-800 bg-black p-4">
      <div className="flex items-center gap-1">{[1,2,3,4,5].map((star)=><button key={star} type="button" aria-label={`${star} stars`} onClick={()=>setRating(star)} className={`text-2xl ${rating>=star?"text-amber-300":"text-zinc-700"}`}>★</button>)}</div>
      <textarea required maxLength={3000} value={comment} onChange={(event)=>setComment(event.target.value)} rows={3} placeholder="Share what worked well…" className="mt-3 w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm outline-none focus:border-purple-500" />
      <button disabled={submitting} className="mt-3 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold disabled:opacity-50">{submitting?"Saving…":"Submit review"}</button>
    </form>:<p className="mt-5 rounded-xl border border-zinc-800 p-4 text-sm text-zinc-400">Sign in to write a review. <Link href="/signin" className="text-purple-300 underline">Sign in</Link></p>}
    <div className="mt-6 space-y-3">{loading?<p className="text-sm text-zinc-500">Loading reviews…</p>:reviews.length===0?<p className="text-sm text-zinc-500">Be the first to review this listing.</p>:reviews.map((review)=><article key={review.id} className="rounded-xl border border-zinc-800 bg-black p-4"><div className="flex justify-between gap-4"><span className="text-sm font-medium">{review.username?`@${review.username}`:`Creator ${review.reviewer_id.slice(0,6)}`}</span><span className="text-amber-300">{"★".repeat(review.rating)}{"☆".repeat(5-review.rating)}</span></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-400">{review.comment}</p><time className="mt-3 block text-xs text-zinc-600">{new Date(review.created_at).toLocaleDateString()}</time></article>)}</div>
  </section>;
}
