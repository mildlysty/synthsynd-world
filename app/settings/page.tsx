"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabase";

export default function SettingsPage() {
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      const owner = data.session?.user.id;
      if (!owner) { if (active) setLoading(false); return; }
      const { data: profile } = await supabase.from("marketplace_profiles").select("username,display_name,bio,avatar_url,website_url").eq("owner_id", owner).maybeSingle();
      if (!active) return;
      setOwnerId(owner);
      if (profile) {
        setUsername(profile.username || ""); setDisplayName(profile.display_name || ""); setBio(profile.bio || "");
        setAvatarUrl(profile.avatar_url || ""); setWebsiteUrl(profile.website_url || "");
      }
      setLoading(false);
    }).catch(() => { if (active) { setError("Could not load your profile."); setLoading(false); } });
    return () => { active = false; };
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!ownerId) return;
    const normalizedUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(normalizedUsername)) {
      setError("Username must be 3–24 characters and use lowercase letters, numbers, or underscores.");
      return;
    }
    setSaving(true); setError(""); setNotice("");
    const { error: saveError } = await supabase.from("marketplace_profiles").upsert({
      owner_id: ownerId, username: normalizedUsername, display_name: displayName.trim(), bio: bio.trim(),
      avatar_url: avatarUrl.trim() || null, website_url: websiteUrl.trim() || null, updated_at: new Date().toISOString(),
    }, { onConflict: "owner_id" });
    if (saveError) setError(saveError.code === "23505" ? "That username is already taken." : `Could not save profile: ${saveError.message}`);
    else { setUsername(normalizedUsername); setNotice("Profile saved."); }
    setSaving(false);
  }

  if (loading) return <main className="p-10 text-zinc-400">Loading account…</main>;
  if (!ownerId) return <main className="p-10 text-center text-zinc-100"><h1 className="text-3xl font-bold">Account settings</h1><p className="mt-3 text-zinc-400">Sign in to manage your profile.</p><Link href="/signin" className="mt-5 inline-block rounded-lg bg-purple-600 px-4 py-2 font-semibold">Sign in</Link></main>;

  const inputClass = "w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-zinc-100 outline-none focus:border-purple-500";
  return <main className="min-h-screen px-5 py-10 text-zinc-100 sm:px-8"><div className="mx-auto max-w-3xl">
    <p className="text-sm text-cyan-300">Account</p><h1 className="mt-2 text-4xl font-bold">Settings</h1><p className="mt-3 text-zinc-400">Set up the public creator profile shown with your listings.</p>
    {error && <p role="alert" className="mt-6 rounded-xl border border-rose-900 bg-rose-950/30 p-4 text-sm text-rose-200">{error}</p>}
    {notice && <p role="status" className="mt-6 rounded-xl border border-emerald-900 bg-emerald-950/30 p-4 text-sm text-emerald-200">{notice}{username && <Link href={`/users/${username}`} className="ml-2 underline">View profile</Link>}</p>}
    <form onSubmit={save} className="mt-7 space-y-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
      <label className="block text-sm text-zinc-400">Username <span className="text-rose-300">*</span><div className="mt-2 flex items-center rounded-xl border border-zinc-700 bg-black px-3"><span className="text-zinc-500">@</span><input required minLength={3} maxLength={24} value={username} onChange={(e)=>setUsername(e.target.value)} className="w-full bg-transparent px-2 py-3 text-zinc-100 outline-none" placeholder="yourname" /></div></label>
      <label className="block text-sm text-zinc-400">Display name<input value={displayName} onChange={(e)=>setDisplayName(e.target.value)} maxLength={80} className={`${inputClass} mt-2`} /></label>
      <label className="block text-sm text-zinc-400">Bio<textarea value={bio} onChange={(e)=>setBio(e.target.value)} maxLength={500} rows={4} className={`${inputClass} mt-2`} placeholder="What do you build?" /></label>
      <label className="block text-sm text-zinc-400">Avatar URL<input type="url" value={avatarUrl} onChange={(e)=>setAvatarUrl(e.target.value)} className={`${inputClass} mt-2`} /></label>
      <label className="block text-sm text-zinc-400">Website<input type="url" value={websiteUrl} onChange={(e)=>setWebsiteUrl(e.target.value)} className={`${inputClass} mt-2`} /></label>
      <button disabled={saving} className="rounded-xl bg-purple-600 px-5 py-3 font-semibold disabled:opacity-50">{saving ? "Saving…" : "Save profile"}</button>
    </form>
  </div></main>;
}
