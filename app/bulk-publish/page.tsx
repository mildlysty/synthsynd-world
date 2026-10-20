"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "../../utils/supabase";

type ImportResult = { repo: string; id?: string; error?: string };

export default function BulkPublishPage() {
  const [repositories, setRepositories] = useState("");
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState("1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<ImportResult[]>([]);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setResults([]);
    try {
      const urls = repositories.split(/\r?\n/).map((url) => url.trim()).filter(Boolean);
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error("Sign in before importing repositories.");
      const response = await fetch("/api/bulk-publish", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
        body: JSON.stringify({ repositories: urls, isFree, priceUsd: Number(price) }),
      });
      const result = await response.json();
      if (!response.ok && !result.results) throw new Error(result.error || "Import failed.");
      setResults(result.results || []);
      if (result.error) setError(result.error);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Import failed."); }
    finally { setBusy(false); }
  }

  return <main className="mx-auto max-w-4xl px-5 py-12 text-zinc-100">
    <Link href="/create" className="text-sm text-purple-300">← Publish</Link>
    <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-cyan-300">Bulk publish</p>
    <h1 className="mt-2 text-4xl font-bold">Import GitHub repositories</h1>
    <p className="mt-4 max-w-2xl leading-7 text-zinc-400">Import up to 10 public repositories at once. Synthsynd creates an agent listing using repository metadata and up to five source or Markdown files. Only import projects you have permission to publish.</p>
    <form onSubmit={submit} className="mt-8 space-y-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
      <label className="block text-sm text-zinc-300">GitHub repository URLs<textarea value={repositories} onChange={(e) => setRepositories(e.target.value)} rows={8} placeholder="https://github.com/owner/repository" className="mt-2 w-full rounded-xl border border-zinc-700 bg-black p-4 font-mono text-sm outline-none focus:border-purple-500" /></label>
      <label className="flex items-center gap-3 text-sm text-zinc-300"><input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} /> Publish as free</label>
      {!isFree && <label className="block max-w-xs text-sm text-zinc-300">Price (USD)<input type="number" min="0.5" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="mt-2 block w-full rounded-lg border border-zinc-700 bg-black px-3 py-2" /></label>}
      {error && <p role="alert" className="rounded-lg border border-rose-900 bg-rose-950/30 p-3 text-sm text-rose-200">{error}</p>}
      <button disabled={busy} className="rounded-xl bg-purple-600 px-5 py-3 font-semibold disabled:opacity-50">{busy ? "Importing repositories…" : "Import & publish"}</button>
    </form>
    {!!results.length && <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6"><h2 className="text-xl font-semibold">Import results</h2><ul className="mt-4 space-y-3">{results.map((item) => <li key={item.repo} className="rounded-xl border border-zinc-800 p-4 text-sm">{item.id ? <><span className="text-emerald-300">Published</span> · <a className="underline" href={`/agent/${item.id}`}>{item.repo}</a></> : <><span className="text-rose-300">Failed</span> · {item.repo}<p className="mt-1 text-zinc-500">{item.error}</p></>}</li>)}</ul></section>}
    <p className="mt-5 text-xs leading-5 text-zinc-500">GitHub's unauthenticated API has rate limits. Large/private repositories are not supported yet. Imported files are descriptive listing content; this app does not execute source code automatically.</p>
  </main>;
}
